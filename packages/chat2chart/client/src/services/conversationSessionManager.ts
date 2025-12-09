/**
 * Conversation Session Manager
 * 
 * Centralized service for managing chat conversation sessions with proper state management,
 * auto-saving, and user experience optimizations.
 */

import { IConversation, IChatMessage } from '@/app/(dashboard)/chat/types';

export interface ConversationSessionState {
    currentConversationId: string | null;
    conversations: IConversation[];
    messages: Map<string, IChatMessage[]>; // conversationId -> messages
    isLoading: boolean;
    isSaving: boolean;
    lastError: string | null;
}

class ConversationSessionManager {
    private state: ConversationSessionState = {
        currentConversationId: null,
        conversations: [],
        messages: new Map(),
        isLoading: false,
        isSaving: false,
        lastError: null
    };

    private listeners: Set<(state: ConversationSessionState) => void> = new Set();
    private saveQueue: Map<string, IChatMessage[]> = new Map();
    private saveTimeout: NodeJS.Timeout | null = null;
    private readonly SAVE_DEBOUNCE_MS = 1000; // Save messages 1 second after last change

    /**
     * Subscribe to state changes
     */
    subscribe(listener: (state: ConversationSessionState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of state changes
     */
    private notify() {
        this.listeners.forEach(listener => listener({ ...this.state }));
    }

    /**
     * Get current state
     */
    getState(): ConversationSessionState {
        return { ...this.state };
    }

    /**
     * Load conversations from API
     */
    async loadConversations(): Promise<IConversation[]> {
        this.state.isLoading = true;
        this.state.lastError = null;
        this.notify();

        try {
            const response = await fetch('/api/conversations?limit=50', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load conversations: ${response.statusText}`);
            }

            const data = await response.json();
            const conversations = (data.items || []).sort((a: IConversation, b: IConversation) => {
                const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
                const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
                return bTime - aTime; // Most recent first
            });

            this.state.conversations = conversations;
            this.state.isLoading = false;
            this.notify();

            // Restore current conversation if exists
            const savedId = localStorage.getItem('current_conversation_id');
            if (savedId && conversations.find((c: IConversation) => c.id === savedId)) {
                await this.setCurrentConversation(savedId);
            } else if (conversations.length > 0) {
                await this.setCurrentConversation(conversations[0].id);
            } else {
                // Create new conversation if none exist
                await this.createNewConversation();
            }

            return conversations;
        } catch (error) {
            this.state.isLoading = false;
            this.state.lastError = error instanceof Error ? error.message : 'Failed to load conversations';
            this.notify();
            console.error('Failed to load conversations:', error);
            throw error;
        }
    }

    /**
     * Create a new conversation
     */
    async createNewConversation(title: string = 'New Conversation'): Promise<IConversation> {
        try {
            console.log('🆕 Creating new conversation with title:', title);
            
            const response = await fetch('/api/conversations', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    json_metadata: '{}'
                })
            });

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = `HTTP ${response.status} ${response.statusText}`;
                }
                
                console.error('❌ Failed to create conversation:', response.status, errorText);
                
                // Provide user-friendly error messages
                let errorMessage = `Failed to create conversation: ${response.status}`;
                if (response.status === 401) {
                    errorMessage = 'Authentication required. Please log in again.';
                } else if (response.status === 403) {
                    errorMessage = 'Not authorized to create conversations.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again.';
                }
                
                throw new Error(errorMessage);
            }

            const newConversation = await response.json();
            
            if (!newConversation || !newConversation.id) {
                console.error('❌ Invalid conversation response:', newConversation);
                throw new Error('Invalid conversation response: missing ID');
            }
            
            console.log('✅ Conversation created successfully:', newConversation.id);
            
            // Add to conversations list (prepend to show newest first)
            this.state.conversations = [newConversation, ...this.state.conversations];
            
            // Initialize messages for this conversation
            this.state.messages.set(newConversation.id, []);
            
            // Set as current (skip message load for new conversations to avoid race condition)
            // Add a small delay to ensure backend has fully committed the conversation
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.setCurrentConversation(newConversation.id, true);
            
            // Clear any previous errors
            this.state.lastError = null;

            this.notify();
            return newConversation;
        } catch (error) {
            console.error('❌ Failed to create conversation:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.state.lastError = errorMessage;
            this.notify();
            throw error;
        }
    }

    /**
     * Set current conversation and load its messages
     */
    async setCurrentConversation(conversationId: string, skipMessageLoad: boolean = false): Promise<void> {
        try {
            // Clear previous conversation's save queue
            this.flushSaveQueue();

            // Update current conversation ID
            this.state.currentConversationId = conversationId;
            localStorage.setItem('current_conversation_id', conversationId);
            
            // Load messages if not already loaded (unless skipMessageLoad is true for new conversations)
            if (!skipMessageLoad && !this.state.messages.has(conversationId)) {
                // For newly created conversations, add retry logic with exponential backoff
                const isNewConversation = !this.state.messages.has(conversationId);
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries) {
                    try {
                        // Wait a bit for newly created conversations to ensure backend has committed
                        if (isNewConversation && retryCount > 0) {
                            await new Promise(resolve => setTimeout(resolve, 200 * retryCount)); // 200ms, 400ms, 600ms
                        }
                        await this.loadMessages(conversationId);
                        break; // Success, exit retry loop
                    } catch (error) {
                        retryCount++;
                        if (retryCount >= maxRetries) {
                            console.warn('⚠️ Failed to load messages after retries:', conversationId, error);
                            // Initialize with empty array if load fails
                            this.state.messages.set(conversationId, []);
                        } else {
                            console.log(`⏳ Retrying message load (attempt ${retryCount}/${maxRetries}):`, conversationId);
                        }
                    }
                }
            } else if (skipMessageLoad) {
                // Initialize with empty array for new conversations
                this.state.messages.set(conversationId, []);
            }

            this.notify();
        } catch (error) {
            console.error('❌ Error setting current conversation:', error);
            // Still update the ID even if message loading fails
            this.state.currentConversationId = conversationId;
            localStorage.setItem('current_conversation_id', conversationId);
            this.notify();
        }
    }

    /**
     * Load messages for a conversation
     */
    async loadMessages(conversationId: string, useCache: boolean = false): Promise<IChatMessage[]> {
        // CRITICAL: Always load from API first to ensure we have the latest messages
        // Cache is only used as a fallback if API fails
        try {
            const response = await fetch(`/api/conversations/${conversationId}?limit=100`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Conversation ${conversationId} not found`);
                    // Try cache as fallback
                    if (useCache) {
                        return this.loadFromCache(conversationId);
                    }
                    return [];
                }
                if (response.status === 403) {
                    console.warn(`Not authorized to access conversation ${conversationId}`);
                    // Try cache as fallback
                    if (useCache) {
                        return this.loadFromCache(conversationId);
                    }
                    return [];
                }
                throw new Error(`Failed to load messages: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.messages && Array.isArray(data.messages)) {
                // Filter out generic error messages
                const errorMessagePatterns = [
                    /^I apologize, but I could not generate a response\.?$/i,
                    /^I apologize, but I encountered an error/i,
                    /^I'm having trouble processing your request/i,
                    /^An error occurred during processing/i
                ];

                const loadedMessages: IChatMessage[] = data.messages
                    .map((msg: any) => {
                        // CRITICAL: Extract from ai_metadata (backend stores everything there)
                        const aiMetadata = msg.ai_metadata || msg.execution_metadata || {};
                        
                        // Extract chart config (can be in multiple places)
                        let echartsConfig = msg.echarts_config || aiMetadata.echarts_config || aiMetadata.chart_config || msg.chart_config;
                        if (echartsConfig && typeof echartsConfig === 'object' && echartsConfig.primary_chart) {
                            echartsConfig = echartsConfig.primary_chart;
                        }
                        
                        return {
                            id: msg.id || crypto.randomUUID(),
                            query: msg.query || msg.content || '',
                            answer: msg.answer || msg.content || '',
                            content: msg.answer || msg.content || msg.query || '',
                            message: msg.answer || msg.content || msg.query || '',
                            created_at: new Date(msg.created_at || Date.now()),
                            updated_at: new Date(msg.updated_at || Date.now()),
                            role: msg.role || (msg.query ? 'user' : 'assistant'),
                            timestamp: msg.created_at || new Date().toISOString(),
                            messageType: msg.message_type || (msg.query ? 'text' : 'ai_response'),
                            saved: true,
                            executionMetadata: aiMetadata,
                            echartsConfig: echartsConfig,
                            chartConfig: echartsConfig,
                            insights: msg.insights || aiMetadata.insights || [],
                            recommendations: msg.recommendations || aiMetadata.recommendations || [],
                            sqlSuggestions: msg.sql_suggestions || aiMetadata.sql_suggestions || [],
                            sqlQuery: msg.sql_query || aiMetadata.sql_query,
                            queryResult: msg.query_result || aiMetadata.query_result,
                            analysis: msg.answer || msg.content || aiMetadata.analysis,
                            dataSourceId: msg.data_source_id || aiMetadata.data_source_id
                        };
                    })
                    .filter((msg: IChatMessage) => {
                        // Always keep user messages
                        if (msg.role === 'user' && msg.query) {
                            return true;
                        }
                        // Filter out generic error messages with no content
                        if (msg.role === 'assistant') {
                            const answer = msg.answer || msg.content || '';
                            if (errorMessagePatterns.some(pattern => pattern.test(answer))) {
                                if (!msg.echartsConfig && !msg.chartConfig && 
                                    (!msg.insights || msg.insights.length === 0) &&
                                    (!msg.recommendations || msg.recommendations.length === 0) &&
                                    !msg.sqlSuggestions) {
                                    return false;
                                }
                            }
                        }
                        return true;
                    })
                    .sort((a: IConversation, b: IConversation) => {
                        // Sort by created_at ascending (oldest first)
                        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                        return aTime - bTime;
                    });

                this.state.messages.set(conversationId, loadedMessages);
                
                // Update cache with fresh data from API
                try {
                    const cacheKey = `conv_messages_${conversationId}`;
                    localStorage.setItem(cacheKey, JSON.stringify(loadedMessages));
                    console.log('✅ Loaded and cached messages from API:', loadedMessages.length);
                } catch (e) {
                    console.warn('Failed to update cache:', e);
                }

                this.notify();
                return loadedMessages;
            }
        } catch (error) {
            console.error('❌ Failed to load messages from API:', error);
            // Fallback to cache if API fails
            if (useCache) {
                console.log('🔄 Falling back to cache...');
                return this.loadFromCache(conversationId);
            }
            throw error;
        }

        return [];
    }

    /**
     * Load messages from cache (localStorage)
     */
    private loadFromCache(conversationId: string): IChatMessage[] {
        try {
            const cacheKey = `conv_messages_${conversationId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const messages = JSON.parse(cached);
                if (Array.isArray(messages) && messages.length > 0) {
                    // CRITICAL: Also load chart configs from separate cache
                    try {
                        const chartsKey = `conv_charts_${conversationId}`;
                        const savedCharts = localStorage.getItem(chartsKey);
                        if (savedCharts) {
                            const chartsData = JSON.parse(savedCharts);
                            const chartsMap = new Map(chartsData.map((c: any) => [c.id, c]));
                            // Merge chart configs into messages
                            messages.forEach((msg: any) => {
                                const chartData = chartsMap.get(msg.id);
                                if (chartData && !msg.echartsConfig) {
                                    msg.echartsConfig = chartData.echartsConfig || chartData.chartConfig;
                                    msg.chartConfig = chartData.chartConfig || chartData.echartsConfig;
                                }
                            });
                        }
                    } catch (chartError) {
                        console.warn('Failed to load charts from cache:', chartError);
                    }
                    
                    // Convert date strings back to Date objects
                    const loadedMessages = messages.map((msg: any) => ({
                        ...msg,
                        created_at: msg.created_at ? new Date(msg.created_at) : new Date(),
                        updated_at: msg.updated_at ? new Date(msg.updated_at) : new Date()
                    }));
                    this.state.messages.set(conversationId, loadedMessages);
                    this.notify();
                    console.log('✅ Loaded messages from cache:', loadedMessages.length);
                    return loadedMessages;
                }
            }
        } catch (e) {
            console.warn('Failed to load from cache:', e);
        }
        return [];
    }

    /**
     * Get messages for current conversation
     */
    getCurrentMessages(): IChatMessage[] {
        if (!this.state.currentConversationId) {
            return [];
        }
        return this.state.messages.get(this.state.currentConversationId) || [];
    }

    /**
     * Add message to conversation (optimistic update)
     * If conversationId is not provided, uses currentConversationId
     */
    addMessage(message: IChatMessage, conversationId?: string): void {
        const targetConversationId = conversationId || this.state.currentConversationId;
        
        if (!targetConversationId) {
            console.warn('No conversation ID provided, cannot add message');
            return;
        }

        // Ensure conversation is in state
        if (!this.state.messages.has(targetConversationId)) {
            this.state.messages.set(targetConversationId, []);
        }

        const messages = this.state.messages.get(targetConversationId) || [];
        messages.push(message);
        this.state.messages.set(targetConversationId, messages);

        // Note: Backend already saves messages via /chat endpoint, so we don't need to save again
        // Only update cache for immediate UI feedback
        try {
            const cacheKey = `conv_messages_${targetConversationId}`;
            localStorage.setItem(cacheKey, JSON.stringify(messages));
        } catch (e) {
            console.warn('Failed to update cache:', e);
        }

        this.notify();
    }

    /**
     * Update message in current conversation
     */
    updateMessage(messageId: string, updates: Partial<IChatMessage>): void {
        if (!this.state.currentConversationId) {
            return;
        }

        const messages = this.state.messages.get(this.state.currentConversationId) || [];
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index] = { ...messages[index], ...updates, updated_at: new Date() };
            this.state.messages.set(this.state.currentConversationId, messages);
            
            // Queue for saving
            this.queueSave(this.state.currentConversationId, messages);

            // Update cache
            try {
                const cacheKey = `conv_messages_${this.state.currentConversationId}`;
                localStorage.setItem(cacheKey, JSON.stringify(messages));
            } catch (e) {
                console.warn('Failed to update cache:', e);
            }

            this.notify();
        }
    }

    /**
     * Queue messages for saving (debounced)
     */
    private queueSave(conversationId: string, messages: IChatMessage[]): void {
        this.saveQueue.set(conversationId, messages);

        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set new timeout
        this.saveTimeout = setTimeout(() => {
            this.flushSaveQueue();
        }, this.SAVE_DEBOUNCE_MS);
    }

    /**
     * Flush save queue to backend
     * NOTE: Backend already saves messages via /chat endpoint, so this is disabled to prevent duplicate saves
     */
    private async flushSaveQueue(): Promise<void> {
        // Backend already saves messages via /chat endpoint, so we don't need to save again
        // This prevents duplicate saves and conflicts
        this.saveQueue.clear();
        return;
    }

    /**
     * Update conversation metadata (e.g., title, last message time)
     */
    async updateConversationMetadata(conversationId: string, updates: Partial<IConversation>): Promise<void> {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error(`Failed to update conversation: ${response.statusText}`);
            }

            // Update in local state
            const index = this.state.conversations.findIndex(c => c.id === conversationId);
            if (index !== -1) {
                this.state.conversations[index] = {
                    ...this.state.conversations[index],
                    ...updates
                };
                // Also update in localStorage cache
                try {
                    const cacheKey = `conv_${conversationId}`;
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        const cachedData = JSON.parse(cached);
                        localStorage.setItem(cacheKey, JSON.stringify({
                            ...cachedData,
                            conversation: {
                                ...cachedData.conversation,
                                ...updates
                            }
                        }));
                    }
                } catch (e) {
                    console.warn('Failed to update conversation in cache:', e);
                }
                this.notify();
            }
        } catch (error) {
            console.error('Failed to update conversation metadata:', error);
            throw error;
        }
    }

    /**
     * Delete conversation
     */
    async deleteConversation(conversationId: string): Promise<void> {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete conversation: ${response.statusText}`);
            }

            // Remove from state
            this.state.conversations = this.state.conversations.filter(c => c.id !== conversationId);
            this.state.messages.delete(conversationId);

            // Clear cache
            localStorage.removeItem(`conv_messages_${conversationId}`);

            // If this was the current conversation, switch to another
            if (this.state.currentConversationId === conversationId) {
                if (this.state.conversations.length > 0) {
                    const nextConvId = this.state.conversations[0].id;
                    if (nextConvId) {
                        await this.setCurrentConversation(nextConvId);
                    } else {
                        this.state.currentConversationId = null;
                        localStorage.removeItem('current_conversation_id');
                    }
                } else {
                    this.state.currentConversationId = null;
                    localStorage.removeItem('current_conversation_id');
                }
            }

            this.notify();
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            throw error;
        }
    }

    /**
     * Clear all state (for logout, etc.)
     * CRITICAL: This must clear ALL conversation-related data to prevent data leakage between users
     */
    clear(): void {
        this.flushSaveQueue();

        this.state = {
            currentConversationId: null,
            conversations: [],
            messages: new Map(),
            isLoading: false,
            isSaving: false,
            lastError: null
        };

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                // Clear all conversation-related localStorage items
                const keysToRemove: string[] = [];
                for (let i = 0; i < window.localStorage.length; i += 1) {
                    const key = window.localStorage.key(i);
                    if (!key) continue;
                    if (key.startsWith('conv_messages_') || key.startsWith('conv_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach((key) => window.localStorage.removeItem(key));
            }
        } catch (error) {
            console.warn('conversationSessionManager.clear: failed to clear cached data', error);
        }

        this.notify();
    }
}

// Singleton instance
export const conversationSessionManager = new ConversationSessionManager();

