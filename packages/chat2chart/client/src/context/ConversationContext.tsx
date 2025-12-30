'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IConversation, IChatMessage } from '@/app/(dashboard)/chat/types';
import { useAuth } from './AuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface ConversationContextValue {
  // State
  conversations: IConversation[];
  currentConversationId: string | null;
  messages: Map<string, IChatMessage[]>;
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createNewConversation: (title?: string) => Promise<IConversation>;
  setCurrentConversation: (conversationId: string) => Promise<void>;
  addMessage: (message: IChatMessage, conversationId: string) => void;
  updateConversationMetadata: (conversationId: string, metadata: Partial<IConversation>) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, IChatMessage[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const accessToken = session?.access_token;

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await authenticatedFetch(`conversations/${conversationId}?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        // ai_metadata is now guaranteed to be in the response (or null)
        const loadedMessages: IChatMessage[] = [];
        
        data.messages.forEach((msg: any) => {
          const aiMetadata = msg.ai_metadata || {};
          
          // Extract echarts config (handle primary_chart wrapper if present)
          let echartsConfig = aiMetadata.echarts_config || aiMetadata.chartConfig;
          if (echartsConfig && typeof echartsConfig === 'object' && echartsConfig.primary_chart) {
            echartsConfig = echartsConfig.primary_chart;
          }

          // CRITICAL: If message has both query and answer, split into two messages
          if (msg.query && msg.answer) {
            // Create user message
            loadedMessages.push({
              id: `${msg.id}-user`,
              query: msg.query,
              answer: '',
              content: msg.query,
              message: msg.query,
              created_at: new Date(msg.created_at || Date.now()),
              updated_at: new Date(msg.created_at || Date.now()),
              role: 'user',
              timestamp: msg.created_at || new Date().toISOString(),
              messageType: 'text',
              saved: true
            });

            // Create assistant message
            loadedMessages.push({
              id: `${msg.id}-assistant`,
              query: '',
              answer: msg.answer,
              content: msg.answer,
              message: msg.answer,
              created_at: new Date(msg.updated_at || msg.created_at || Date.now()),
              updated_at: new Date(msg.updated_at || Date.now()),
              role: 'assistant',
              timestamp: msg.updated_at || msg.created_at || new Date().toISOString(),
              messageType: 'ai_response',
              saved: true,
              executionMetadata: aiMetadata.execution_metadata || aiMetadata,
              echartsConfig: echartsConfig,
              chartConfig: echartsConfig,
              insights: aiMetadata.insights || [],
              recommendations: aiMetadata.recommendations || [],
              sqlSuggestions: aiMetadata.sql_suggestions || [],
              sqlQuery: aiMetadata.sql_query,
              queryResult: aiMetadata.query_result,
              analysis: msg.answer,
              dataSourceId: aiMetadata.data_source_id
            });
          } else {
            // Original logic for messages with only query or only answer
            const role = msg.query ? 'user' : 'assistant';

            loadedMessages.push({
              id: msg.id || crypto.randomUUID(),
              query: msg.query || '',
              answer: msg.answer || '',
              content: msg.answer || msg.query || '',
              message: msg.answer || msg.query || '',
              created_at: new Date(msg.created_at || Date.now()),
              updated_at: new Date(msg.updated_at || Date.now()),
              role: role,
              timestamp: msg.created_at || new Date().toISOString(),
              messageType: msg.query ? 'text' : 'ai_response',
              saved: true,
              executionMetadata: aiMetadata.execution_metadata || aiMetadata,
              echartsConfig: echartsConfig,
              chartConfig: echartsConfig,
              insights: aiMetadata.insights || [],
              recommendations: aiMetadata.recommendations || [],
              sqlSuggestions: aiMetadata.sql_suggestions || [],
              sqlQuery: aiMetadata.sql_query,
              queryResult: aiMetadata.query_result,
              analysis: msg.answer || '',
              dataSourceId: aiMetadata.data_source_id
            });
          }
        });

        setMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(conversationId, loadedMessages);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Initialize with empty array on error
      setMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(conversationId, []);
        return newMap;
      });
    }
  };

  // Load conversations from API
  const loadConversations = async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const response = await authenticatedFetch('/api/conversations?limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.statusText}`);
      }

      const data = await response.json();
      const loadedConversations = (data.items || []).sort((a: IConversation, b: IConversation) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime; // Most recent first
      });

      setConversations(loadedConversations);

      // Select the latest updated conversation as current
      if (loadedConversations.length > 0 && !currentConversationId) {
        const latestConversation = loadedConversations[0];
        await setCurrentConversation(latestConversation.id!);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
      setLastError(errorMessage);
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Set current conversation and load its messages
  const setCurrentConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);

    // Load messages if not already loaded
    if (!messages.has(conversationId)) {
      await loadMessages(conversationId);
    }
  };

  // Create new conversation
  const createNewConversation = async (title: string = 'New Conversation'): Promise<IConversation> => {
    setIsSaving(true);

    try {
      const response = await authenticatedFetch('/api/conversations', {
        method: 'POST',
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
        throw new Error('Invalid conversation response: missing ID');
      }

      // Add to conversations list (prepend to show newest first)
      setConversations(prev => [newConversation, ...prev]);

      // Initialize messages for this conversation
      setMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(newConversation.id, []);
        return newMap;
      });

      // Set as current
      await setCurrentConversation(newConversation.id);

      return newConversation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Add message optimistically
  const addMessage = (message: IChatMessage, conversationId: string) => {
    setMessages(prev => {
      const newMap = new Map(prev);
      const existingMessages = newMap.get(conversationId) || [];
      newMap.set(conversationId, [...existingMessages, message]);
      return newMap;
    });
  };

  // Update conversation metadata
  const updateConversationMetadata = async (conversationId: string, metadata: Partial<IConversation>) => {
    try {
      const response = await authenticatedFetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`);
      }

      const updated = await response.json();

      // Update in conversations list
      setConversations(prev => 
        prev.map(conv => conv.id === conversationId ? updated : conv)
      );
    } catch (error) {
      console.error('Failed to update conversation metadata:', error);
      throw error;
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await authenticatedFetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`);
      }

      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // Remove messages
      setMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      });

      // If deleted conversation was current, select first available or clear
      if (currentConversationId === conversationId) {
        const remaining = conversations.filter(conv => conv.id !== conversationId);
        if (remaining.length > 0) {
          await setCurrentConversation(remaining[0].id!);
        } else {
          setCurrentConversationId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  };

  // Initialize: Load conversations when authenticated
  useEffect(() => {
    if (accessToken && !isLoading) {
      loadConversations();
    }
  }, [accessToken]); // Run when accessToken becomes available

  const value: ConversationContextValue = {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isSaving,
    lastError,
    loadConversations,
    createNewConversation,
    setCurrentConversation,
    addMessage,
    updateConversationMetadata,
    deleteConversation
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within ConversationProvider');
  }
  return context;
}

