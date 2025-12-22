'use client';
export const dynamic = 'force-dynamic';
// Simple dynamic configuration that actually works

import { Tabs, Card, Row, Col, Button, Space, Tag, Typography, message, Tooltip, Grid } from 'antd';
import { MessageOutlined, DatabaseOutlined, BarChartOutlined, HistoryOutlined, SettingOutlined, DragOutlined, ArrowLeftOutlined, ArrowRightOutlined, FileTextOutlined, ExpandOutlined, PlusOutlined } from '@ant-design/icons';
import ModelSelector from '@/app/components/ModelSelector/ModelSelector';
import React, { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel/ChatPanel';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import EnhancedDataPanel from './components/DataPanel/EnhancedDataPanel';
// History panel removed - functionality moved to header dropdown
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import { ExtendedTable, IConversation, IDatabase } from './types';
import { IFileUpload } from '@/app/components/FileUpload/types';
import { useSearchParams } from 'next/navigation';
import { conversationSessionManager } from '@/services/conversationSessionManager';
import { useAuth } from '@/context/AuthContext';

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
    const { session } = useAuth();
    // State management for conversations
    const [conversations, setConversations] = useState<IConversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [conversationState, setConversationState] = useState<IConversation | undefined>(undefined);
    const [activeTab, setActiveTab] = React.useState<string>('chat');
    const [selectedDataSource, setSelectedDataSource] = React.useState<DataSource | null>(null);
    const [generatedCharts, setGeneratedCharts] = React.useState<Record<string, any>[]>([]);
    const [dataPanelCollapsed, setDataPanelCollapsed] = React.useState<boolean>(false);
    const [sqlResults, setSqlResults] = React.useState<Record<string, any>[]>([]);
    const [showDataSourceModal, setShowDataSourceModal] = React.useState<boolean>(false);
    // Drag handlers removed - history panel removed
    const [selectedDataSources, setSelectedDataSources] = React.useState<DataSource[]>([]); // Data sources selected from DataPanel
    const autoCollapseRef = React.useRef<{ applied: boolean; mode: 'none' | 'both' | 'history' } | null>(null);

    const screens = Grid.useBreakpoint();
    const isLargeScreen = screens.lg ?? false;
    const isStackedLayout = !isLargeScreen;
    const effectiveDataPanelCollapsed = isStackedLayout ? false : dataPanelCollapsed;

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

    // Load conversations on component mount using session manager
    useEffect(() => {
        const initializeConversations = async () => {
            try {
                // CRITICAL: Always restore conversation from localStorage FIRST (before API call)
                // This ensures instant restoration when navigating back
                const savedConversationId = localStorage.getItem('current_conversation_id');
                
                // Load conversations using session manager
                const loadedConversations = await conversationSessionManager.loadConversations(session?.access_token);
                setConversations(loadedConversations);
                
                // Restore current conversation from localStorage if available
                if (savedConversationId) {
                    const savedConv = loadedConversations.find(c => c.id === savedConversationId);
                    if (savedConv) {
                        // CRITICAL: Set conversation state immediately for instant UI update
                        setCurrentConversationId(savedConversationId);
                        setConversationState(savedConv);
                        
                        // CRITICAL: Load messages for the saved conversation (don't skip)
                        // This ensures messages are loaded when returning to the page
                        await conversationSessionManager.setCurrentConversation(savedConversationId, false, session?.access_token);
                        console.log('✅ Restored conversation and loaded messages:', savedConversationId);
                        
                        // CRITICAL: Restore data source from conversation metadata AND localStorage
                        // Try conversation metadata first, then fallback to localStorage
                        let dataSourceRestored = false;
                        
                        if (savedConv.json_metadata) {
                            try {
                                const metadata = typeof savedConv.json_metadata === 'string' 
                                    ? JSON.parse(savedConv.json_metadata) 
                                    : savedConv.json_metadata;
                                const dataSourceId = metadata.last_data_source_id || metadata.data_source_id || metadata.dataSourceId;
                                // CRITICAL: Skip invalid or demo data source IDs (like cube_real_001)
                                if (dataSourceId && typeof dataSourceId === 'string' && !dataSourceId.includes('cube_real_') && !dataSourceId.includes('demo_')) {
                                    try {
                                        const dsResponse = await fetch(`/api/data/sources/${dataSourceId}`, {
                                            credentials: 'include'
                                            // Rely on cookies for auth (more secure)
                                        });
                                        if (dsResponse.ok) {
                                            const dataSource = await dsResponse.json();
                                            setSelectedDataSource(dataSource);
                                            localStorage.setItem('selected_data_source', JSON.stringify(dataSource));
                                            localStorage.setItem(`conv_has_data_source_${savedConversationId}`, 'true');
                                            console.log('✅ Restored data source from conversation metadata:', dataSource.name);
                                            dataSourceRestored = true;
                                        } else if (dsResponse.status === 404) {
                                            console.warn('⚠️ Data source not found, skipping:', dataSourceId);
                                        }
                                    } catch (e) {
                                        console.warn('Failed to load data source from conversation metadata:', e);
                                    }
                                }
                            } catch (e) {
                                console.warn('Failed to parse conversation metadata:', e);
                            }
                        }
                        
                        // Fallback: Try localStorage if conversation metadata didn't have data source
                        if (!dataSourceRestored) {
                            try {
                                const savedDataSource = localStorage.getItem('selected_data_source');
                                if (savedDataSource) {
                                    const dataSource = JSON.parse(savedDataSource);
                                    // Verify data source still exists
                                    const dsResponse = await fetch(`/api/data/sources/${dataSource.id}`, {
                                        credentials: 'include'
                                    });
                                    if (dsResponse.ok) {
                                        const verifiedDataSource = await dsResponse.json();
                                        setSelectedDataSource(verifiedDataSource);
                                        console.log('✅ Restored data source from localStorage:', verifiedDataSource.name);
                                    } else {
                                        // Data source no longer exists, clear it
                                        localStorage.removeItem('selected_data_source');
                                    }
                                }
                            } catch (e) {
                                console.warn('Failed to restore data source from localStorage:', e);
                            }
                        }
                    } else {
                        console.warn('⚠️ Saved conversation not found in loaded conversations:', savedConversationId);
                    }
                }
                
                // Subscribe to session manager state changes
                const unsubscribe = conversationSessionManager.subscribe((state) => {
                    setConversations(state.conversations);
                    if (state.currentConversationId !== currentConversationId) {
                        setCurrentConversationId(state.currentConversationId);
                        if (state.currentConversationId) {
                            const conv = state.conversations.find(c => c.id === state.currentConversationId);
                            if (conv) {
                                setConversationState(conv);
                            }
                        }
                    }
                });
                
                return unsubscribe;
            } catch (error) {
                console.error('Failed to initialize conversations:', error);
            }
        };
        
        initializeConversations();
    }, []);
    
    // Load persisted data source from localStorage (only on mount, not when selectedDataSource changes)
    // CRITICAL: Don't include selectedDataSource in dependencies to avoid infinite loop
    useEffect(() => {
        try {
            const savedDataSource = localStorage.getItem('selected_data_source');
            if (savedDataSource) {
                const dataSource = JSON.parse(savedDataSource);
                // Always restore if it exists and is different from current
                if (!selectedDataSource || selectedDataSource.id !== dataSource.id) {
                    setSelectedDataSource(dataSource);
                    console.log('✅ Loaded persisted data source from localStorage:', dataSource.name);
                }
            }
        } catch (e) {
            console.warn('Failed to load persisted data source:', e);
        }
    }, []); // Run only once on mount

    // Persist selected data source to localStorage AND conversation metadata
    // CRITICAL: This ensures data source persists across screen switches and navigation
    useEffect(() => {
        if (selectedDataSource) {
            try {
                // Save to localStorage (global preference) - persists across all navigation
                localStorage.setItem('selected_data_source', JSON.stringify(selectedDataSource));
                console.log('💾 Persisted data source to localStorage:', selectedDataSource.name);
                
                // Also save to current conversation metadata (per-conversation)
                if (currentConversationId) {
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json'
                    };
                    if (session?.access_token) {
                        headers['Authorization'] = `Bearer ${session.access_token}`;
                    }
                    fetch(`/api/conversations/${currentConversationId}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers,
                        body: JSON.stringify({
                            json_metadata: JSON.stringify({
                                last_data_source_id: selectedDataSource.id,
                                data_source_name: selectedDataSource.name,
                                data_source_type: selectedDataSource.type
                            })
                        })
                    }).catch(e => console.warn('Failed to save data source to conversation:', e));
                }
            } catch (e) {
                console.warn('Failed to persist data source:', e);
            }
        } else {
            // CRITICAL: Only clear localStorage if explicitly cleared (not on navigation)
            // Don't clear on every null - might be temporary during load
            // Only clear if we're sure user wants to deselect
            const shouldClear = !currentConversationId || 
                               (currentConversationId && !localStorage.getItem(`conv_has_data_source_${currentConversationId}`));
            if (shouldClear) {
                localStorage.removeItem('selected_data_source');
            }
        }
    }, [selectedDataSource, currentConversationId]);
    
    // CRITICAL: Restore data source from localStorage on mount AND when returning to page
    // This ensures data source persists across screen switches
    useEffect(() => {
        // Only restore if we don't already have a selected data source
        if (!selectedDataSource) {
            try {
                const savedDataSource = localStorage.getItem('selected_data_source');
                if (savedDataSource) {
                    const dataSource = JSON.parse(savedDataSource);
                    // Verify data source still exists before restoring
                    fetch(`/api/data/sources/${dataSource.id}`, {
                        credentials: 'include'
                    }).then(response => {
                        if (response.ok) {
                            response.json().then(dsData => {
                                setSelectedDataSource(dsData);
                                console.log('✅ Restored data source from localStorage after screen switch:', dsData.name);
                            });
                        } else {
                            // Data source no longer exists, clear it
                            localStorage.removeItem('selected_data_source');
                        }
                    }).catch(() => {
                        // On error, try to restore anyway (might be network issue)
                        setSelectedDataSource(dataSource);
                    });
                }
            } catch (e) {
                console.warn('Failed to restore data source from localStorage:', e);
            }
        }
    }, []); // Only run on mount

    // CRITICAL FIX: When conversation switches, restore data source from conversation metadata
    // This prevents data source from "randomly" being deselected on conversation switch
    useEffect(() => {
        if (currentConversationId && conversationState && conversationState.json_metadata) {
            try {
                const metadata = typeof conversationState.json_metadata === 'string'
                    ? JSON.parse(conversationState.json_metadata)
                    : conversationState.json_metadata;
                
                const dataSourceId = metadata.last_data_source_id || metadata.data_source_id;
                
                // Only restore if it's different from current selection
                if (dataSourceId && (!selectedDataSource || selectedDataSource.id !== dataSourceId)) {
                    // Verify the data source still exists
                    fetch(`/api/data/sources/${dataSourceId}`, {
                        credentials: 'include'
                    }).then(response => {
                        if (response.ok) {
                            response.json().then(dsData => {
                                // Double-check we haven't changed conversations in the meantime
                                if (currentConversationId === dsData.conversation_id || 
                                    currentConversationId === conversationState.id) {
                                    setSelectedDataSource(dsData);
                                    console.log('✅ Restored data source on conversation switch:', dsData.name);
                                }
                            });
                        }
                    }).catch(err => {
                        console.warn('Failed to restore data source for conversation:', err);
                    });
                }
            } catch (e) {
                console.warn('Failed to parse conversation metadata:', e);
            }
        }
    }, [currentConversationId]); // Trigger only when conversation changes

    // Load conversations from API (not localStorage)
    const loadConversations = async () => {
        try {
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch('/api/conversations?limit=50', {
                method: 'GET',
                credentials: 'include',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                const loadedConversations = data.items || [];
                
                // Sort conversations by updated_at (most recent first)
                loadedConversations.sort((a: IConversation, b: IConversation) => {
                    return getConversationTimestamp(b) - getConversationTimestamp(a);
                });
                
                setConversations(loadedConversations);
                
                // Restore current conversation if exists, or use most recent as default
                const currentId = localStorage.getItem('current_conversation_id');
                let conversationToUse: IConversation | null = null;
                
                if (currentId && loadedConversations.length > 0) {
                    const current = loadedConversations.find((c: IConversation) => c.id === currentId);
                    if (current) {
                        conversationToUse = current;
                        console.log('✅ Restored saved conversation:', currentId);
                    }
                }
                
                // If no saved conversation found or no conversations exist, use most recent
                if (!conversationToUse && loadedConversations.length > 0) {
                    const fallbackConversation = loadedConversations[0];
                    if (fallbackConversation) {
                        conversationToUse = fallbackConversation;
                        if (fallbackConversation.id) {
                            console.log('✅ Using most recent conversation:', fallbackConversation.id);
                        }
                    }
                }
                
                // If no conversations exist, create a default one
                if (!conversationToUse && loadedConversations.length === 0) {
                    try {
                        const headers: Record<string, string> = {
                            'Content-Type': 'application/json',
                        };
                        if (session?.access_token) {
                            headers['Authorization'] = `Bearer ${session.access_token}`;
                        }
                        
                        const createResponse = await fetch('/api/conversations', {
                            method: 'POST',
                            credentials: 'include',
                            headers,
                            body: JSON.stringify({
                                title: 'New Conversation',
                                json_metadata: '{}'
                            })
                        });
                        
                        if (createResponse.ok) {
                            const newConv = await createResponse.json();
                            setConversations([newConv]);
                            setConversationState(newConv);
                            saveCurrentConversationId(newConv.id ?? null);
                            if (newConv?.id) {
                                console.log('✅ Created new conversation:', newConv.id);
                            }
                            return;
                        }
                    } catch (createError) {
                        console.error('Failed to create default conversation:', createError);
                    }
                }
                
                // Set the conversation to use
                if (conversationToUse) {
                    setConversationState(conversationToUse);
                    setCurrentConversationId(conversationToUse.id ?? null);
                    saveCurrentConversationId(conversationToUse.id ?? null);
                    
                    // CRITICAL: Restore data source from conversation metadata
                    try {
                        const metadataRaw = conversationToUse.json_metadata;
                        let metadata: any = {};
                        if (metadataRaw) {
                            if (typeof metadataRaw === 'string') {
                                metadata = JSON.parse(metadataRaw);
                            } else if (typeof metadataRaw === 'object') {
                                metadata = metadataRaw;
                            }
                        }
                        const dataSourceId = metadata.last_data_source_id || metadata.data_source_id || null;
                        // CRITICAL: Skip invalid or demo data source IDs
                        if (dataSourceId && typeof dataSourceId === 'string' && !dataSourceId.includes('cube_real_') && !dataSourceId.includes('demo_')) {
                            // Load and set the data source
                            const dsResponse = await fetch(`/api/data/sources/${dataSourceId}`, {
                                credentials: 'include'
                            });
                            if (dsResponse.ok) {
                                const dsData = await dsResponse.json();
                                setSelectedDataSource(dsData);
                                console.log('✅ Restored data source from conversation:', dsData.name);
                            } else if (dsResponse.status === 404) {
                                console.warn('⚠️ Data source not found, skipping:', dataSourceId);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to restore data source from conversation:', e);
                    }
                }
            } else {
                console.error('Failed to load conversations from API');
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    // Listen for page visibility changes - only reload if needed (not on every tab switch)
    useEffect(() => {
        let lastReloadTime = Date.now();
        const RELOAD_INTERVAL = 30000; // Only reload if 30 seconds have passed
        
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                const timeSinceLastReload = Date.now() - lastReloadTime;
                // Only reload if enough time has passed (prevents excessive reloads)
                if (timeSinceLastReload > RELOAD_INTERVAL) {
                    console.log('🔄 Page visible, reloading conversations (30s+ since last reload)');
                    loadConversations();
                    lastReloadTime = Date.now();
                } else {
                    console.log('⏭️ Skipping reload (only', Math.round(timeSinceLastReload / 1000), 's since last reload)');
                }
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
    const handleSelectConversation = useCallback(async (conversation: IConversation) => {
        if (!conversation.id) {
            console.warn('Cannot select conversation without a valid id');
            return;
        }
        const conversationId = conversation.id;
        console.log('🔄 Selecting conversation:', conversationId, conversation.title);
        
        // Save current conversation's data source before switching
        if (currentConversationId && selectedDataSource) {
            try {
                // Update conversation metadata with current data source
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
                await fetch(`/api/conversations/${currentConversationId}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({
                        json_metadata: JSON.stringify({
                            last_data_source_id: selectedDataSource.id,
                            data_source_name: selectedDataSource.name
                        })
                    })
                });
            } catch (e) {
                console.warn('Failed to save data source to conversation:', e);
            }
        }
        
        // Use session manager to switch conversation (CRITICAL: don't skip message loading)
        await conversationSessionManager.setCurrentConversation(conversationId, false, session?.access_token);
        
        // Set conversation state immediately
        setConversationState(conversation);
        saveCurrentConversationId(conversationId);
        
        // CRITICAL: Force ChatPanel to reload messages by updating conversationId
        // This ensures messages are loaded when switching conversations
        setCurrentConversationId(conversationId);
        
        // Load conversation details with messages from API
        try {
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch(`/api/conversations/${conversationId}?limit=100`, {
                method: 'GET',
                credentials: 'include',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Loaded conversation data:', {
                    conversationId,
                    messageCount: data.messages?.length || 0,
                    hasDataSource: !!data.conversation?.json_metadata
                });
                
                // Extract data source ID from conversation metadata or most recent message
                // Note: A conversation can have multiple data sources (user may switch during conversation)
                // We restore the most recent/last used data source
                let dataSourceId: string | null = null;
                
                // Try to get from conversation metadata (last_data_source_id or data_source_id)
                if (data.conversation?.json_metadata) {
                    try {
                        const metadata = typeof data.conversation.json_metadata === 'string' 
                            ? JSON.parse(data.conversation.json_metadata) 
                            : data.conversation.json_metadata;
                        // Prefer last_data_source_id (most recent), fallback to data_source_id
                        dataSourceId = metadata.last_data_source_id || metadata.data_source_id || metadata.dataSourceId || null;
                        if (dataSourceId) {
                            console.log('✅ Found data source ID in conversation metadata:', dataSourceId);
                        }
                    } catch (e) {
                        console.warn('Failed to parse conversation metadata:', e);
                    }
                }
                
                // If not in metadata, try to get from most recent message with data_source_id
                if (!dataSourceId && data.messages && Array.isArray(data.messages)) {
                    // Search from most recent to oldest
                    for (let i = data.messages.length - 1; i >= 0; i--) {
                        const msg = data.messages[i];
                        const msgMetadata = msg.ai_metadata || {};
                        if (msgMetadata.data_source_id) {
                            dataSourceId = msgMetadata.data_source_id;
                            console.log('✅ Found data source ID in most recent message:', dataSourceId);
                            break;
                        }
                    }
                }
                
                // Restore data source if found (skip invalid IDs)
                if (dataSourceId && typeof dataSourceId === 'string' && !dataSourceId.includes('cube_real_') && !dataSourceId.includes('demo_')) {
                    try {
                        const dsResponse = await fetch(`/api/data/sources/${dataSourceId}`, {
                            credentials: 'include'
                        });
                        if (dsResponse.ok) {
                            const dsData = await dsResponse.json();
                            setSelectedDataSource(dsData);
                            console.log('✅ Restored data source:', dsData.name);
                        } else if (dsResponse.status === 404) {
                            console.warn('⚠️ Data source not found, skipping:', dataSourceId);
                            // CRITICAL: Don't clear existing data source if it's still valid
                            // Only clear if current data source doesn't match any conversation
                            // This prevents losing data source when switching between conversations
                        }
                    } catch (e) {
                        console.error('Failed to load data source:', e);
                        // CRITICAL: Don't clear on error - keep existing data source
                    }
                } else {
                    // No data source for this conversation - but don't clear if we have a valid one
                    // User might have selected a data source that's not yet saved to conversation metadata
                    console.log('ℹ️ No data source found in conversation metadata, keeping current selection if valid');
                }
            } else {
                console.error('Failed to load conversation details');
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }, [saveCurrentConversationId, currentConversationId, selectedDataSource]);

    // Handle new conversation
    const handleNewConversation = useCallback(async () => {
        try {
            console.log('🆕 Creating new conversation...');
            
            // Use session manager to create new conversation
            const newConversation = await conversationSessionManager.createNewConversation('New Conversation', session?.access_token);
            
            if (!newConversation || !newConversation.id) {
                throw new Error('Failed to create conversation - no ID returned');
            }
            
            console.log('✅ New conversation created:', newConversation.id);
            
            // CRITICAL: Clear all previous conversation state to ensure complete independence
            // BUT: Keep data source selection - user might want to use it in new conversation
            // Only clear if user explicitly wants to start fresh (they can deselect manually)
            // setSelectedDataSource(null); // REMOVED - keep data source for new conversation
            // localStorage.removeItem('selected_data_source'); // REMOVED - keep persistence
            
            // Clear generated charts and SQL results for the new conversation
            setGeneratedCharts([]);
            setSqlResults([]);
            
            // Set conversation state immediately (don't wait - backend has committed)
            setConversationState(newConversation);
            setCurrentConversationId(newConversation.id);
            saveCurrentConversationId(newConversation.id);
            
            // Add new conversation to local state immediately for real-time UI update
            setConversations(prev => {
                // Check if already exists to avoid duplicates
                if (prev.find(c => c.id === newConversation.id)) {
                    return prev;
                }
                // Add to beginning (most recent first)
                return [newConversation, ...prev];
            });
            
            // Reload conversations list to include the new one (but don't try to load messages yet)
            // This ensures we have the latest from backend, but UI already shows the new one
            loadConversations().catch(err => console.warn('Failed to reload conversations:', err));
            
            // Ensure we're on chat tab
            setActiveTab('chat');
            
            console.log('✅ New conversation setup complete - messages will load when user sends first message');
            message.success('New conversation created');
        } catch (error) {
            console.error('❌ Error creating conversation:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create new conversation. Please try again.';
            message.error(errorMessage);
        }
    }, [saveCurrentConversationId, loadConversations]);

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

    // Panel width management for better content visibility
    const handleDataPanelExpand = () => {
        if (dataPanelCollapsed) {
            setDataPanelCollapsed(false);
        } else {
            setDataPanelCollapsed(true);
        }
    };

    // History panel removed - functionality moved to header dropdown

    // Responsive auto-collapse for side panels
    useEffect(() => {
        const applyResponsiveLayout = () => {
            if (typeof window === 'undefined') return;
            const w = window.innerWidth;
            // <1280px: collapse data panel
            if (w < 1280) {
                setDataPanelCollapsed(true);
                autoCollapseRef.current = { applied: true, mode: 'both' };
                return;
            }
            // >=1280px: expand data panel unless user collapsed manually
            if (autoCollapseRef.current?.applied) {
                setDataPanelCollapsed(false);
                autoCollapseRef.current = { applied: false, mode: 'none' };
            }
        };
        applyResponsiveLayout();
        window.addEventListener('resize', applyResponsiveLayout);
        return () => window.removeEventListener('resize', applyResponsiveLayout);
    }, []);

    const renderWelcomeCards = () => (
        <Row gutter={[16, 16]} style={{ padding: '24px' }}>
            <Col span={8}>
                <Card 
                    hoverable
                    onClick={() => setShowDataSourceModal(true)}
                    style={{ textAlign: 'center', height: 200 }}
                >
                    <DatabaseOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)', marginBottom: 16 }} />
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
                    <MessageOutlined style={{ fontSize: 48, color: 'var(--color-functional-success)', marginBottom: 16 }} />
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
                    <BarChartOutlined style={{ fontSize: 48, color: 'var(--color-functional-warning)', marginBottom: 16 }} />
                    <h3>Generated Charts</h3>
                    <p>View and manage all your generated charts and visualizations</p>
                </Card>
            </Col>
        </Row>
    );

    const getConversationTimestamp = (conversation: IConversation) => {
        const metadata = conversation as Record<string, any>;
        const timestamp = metadata?.updated_at ?? metadata?.created_at ?? 0;
        return new Date(timestamp).getTime();
    };

    const renderChartsGallery = () => (
        <div style={{ padding: '24px' }}>
            <Row gutter={[16, 16]}>
                {generatedCharts.length === 0 ? (
                    <Col span={24}>
                        <Card style={{ textAlign: 'center', padding: '48px' }}>
                            <BarChartOutlined style={{ fontSize: 64, color: 'var(--color-border-primary)', marginBottom: 16 }} />
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
                                cover={<div style={{ height: 200, backgroundColor: 'var(--ant-color-fill-secondary, var(--color-surface-raised))' }}>Chart Preview</div>}
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
        <div className="chat-page-container" style={{ 
            height: 'calc(100vh - 64px)', 
            minHeight: 'calc(100vh - 64px)',
            maxHeight: 'calc(100vh - 64px)',
            width: '100%',
            display: 'flex', 
            flexDirection: isStackedLayout ? 'column' : 'row',
            gap: isStackedLayout ? 16 : 0,
            background: 'var(--ant-color-bg-layout)',
            overflow: 'hidden',
            boxSizing: 'border-box',
            margin: 0,
            padding: 0
        }}>
            {/* Left Panel: Chat History - REMOVED, now in header dropdown */}
            {/* Center: Main Chat Area */}
            <div style={{ 
                flex: 1,
                height: '100%',
                minHeight: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                background: 'var(--ant-color-bg-layout)',
                order: isStackedLayout ? 1 : 0,
                overflow: 'hidden',
                boxSizing: 'border-box',
                position: 'relative'
            }}>
                <ErrorBoundary>
                    <ChatPanel
                        conversationId={currentConversationId || undefined}
                        callback={(props: {
                            conversation: IConversation;
                        }) => {
                            setConversationState(props.conversation);
                        }}
                        selectedDataSource={selectedDataSource}
                        selectedDataSources={selectedDataSources}
                        model={openAIModel}
                        onModelChange={(id: string) => setOpenAIModel(id)}
                        onSelectConversation={(conversation) => {
                            handleSelectConversation(conversation);
                            setDb(undefined);
                            setSchema(undefined);
                            setTables(undefined);
                        }}
                        onNewConversation={() => {
                            handleNewConversation();
                            setDb(undefined);
                            setSchema(undefined);
                            setTables(undefined);
                            setFile(undefined);
                        }}
                        onConversationDeleted={() => {
                            // If current conversation was deleted, switch to first available or create new
                            if (conversations.length > 1) {
                                const remaining = conversations.filter(c => c.id !== currentConversationId);
                                if (remaining.length > 0) {
                                    handleSelectConversation(remaining[0]);
                                } else {
                                    handleNewConversation();
                                }
                            } else {
                                handleNewConversation();
                            }
                        }}
                    />
                </ErrorBoundary>
            </div>

            {/* Right Panel: Data Sources */}
            <div style={{ 
                width: isStackedLayout ? '100%' : effectiveDataPanelCollapsed ? '64px' : '320px',
                minWidth: isStackedLayout ? '100%' : effectiveDataPanelCollapsed ? '64px' : '320px',
                minHeight: isStackedLayout ? 'auto' : '100%',
                borderLeft: !isStackedLayout && !effectiveDataPanelCollapsed ? `1px solid var(--ant-color-border)` : 'none',
                borderTop: isStackedLayout ? `1px solid var(--ant-color-border)` : 'none',
                background: 'var(--layout-panel-background, var(--ant-color-bg-container))',
                transition: 'all var(--transition-base, 0.3s ease)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: !isStackedLayout && !effectiveDataPanelCollapsed ? 'inset 1px 0 0 rgba(255,255,255,0.04)' : undefined,
                marginTop: isStackedLayout ? 16 : 0,
                order: isStackedLayout ? 2 : 0
            }}>
                {!isStackedLayout && effectiveDataPanelCollapsed ? (
                    <div style={{ 
                        padding: '16px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        background: 'var(--ant-color-bg-container)',
                        border: '1px solid var(--ant-color-border)',
                        borderRadius: 'var(--ant-border-radius-lg)',
                        height: '100%',
                        boxShadow: 'var(--ant-box-shadow)'
                    }}>
                        <Tooltip title="Expand Data Panel" placement="left">
                            <Button type="text" onClick={handleDataPanelExpand} icon={<ExpandOutlined />} />
                        </Tooltip>
                        <Tooltip title="Add Data Source" placement="left">
                            <Button type="text" onClick={() => setShowDataSourceModal(true)} icon={<PlusOutlined />} />
                        </Tooltip>
                        {/* Removed Data Source icon - already available in Data Sources panel */}
                    </div>
                ) : (
                    <EnhancedDataPanel
                        onDataSourceSelect={(dataSource) => {
                            console.log('🔄 Chat page onDataSourceSelect called with:', dataSource);
                            // CRITICAL: Force state update to ensure UI reflects selection
                            setSelectedDataSource(dataSource);
                            
                            if (dataSource) {
                                setSelectedDataSources([dataSource]);
                                // Force a re-render to ensure DataPanel shows selection
                                console.log('✅ Data source selected:', dataSource.id, dataSource.name);
                            } else {
                                setSelectedDataSources([]);
                            }
                            
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
                            console.log('Refreshing data sources...');
                        }}
                        onDataSourcesChange={(sources) => {
                            setSelectedDataSources(sources);
                        }}
                    />
                )}
            </div>

            {/* Modals */}
            <UniversalDataSourceModal
                isOpen={showDataSourceModal}
                onClose={() => setShowDataSourceModal(false)}
                onDataSourceCreated={handleDataSourceCreated}
                initialDataSourceType="file"
                isChatIntegration={true}
            />
        </div>
    );
};

export default ChatToChart;
