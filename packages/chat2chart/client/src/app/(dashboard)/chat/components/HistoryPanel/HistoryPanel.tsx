import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Button, message as antMessage } from 'antd';
import React from 'react';
import { IConversation, Pagination } from '../../types';
import ChatHistoryItem from './HistoryItem';
import './styles.css';
import { fetchApi } from '@/utils/api';

interface ChatHistoryPanelProps {
    id?: string;
    current?: IConversation;
    onClick: (props: IConversation) => void;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = (props) => {
    const [loading, setLoading] = React.useState<boolean>(false);

    const [pagination, setPagination] = React.useState<Pagination>({
        offset: 0,
        total_pages: 0,
        limit: 10,
        total: 0,
        current_page: 0,
        has_more: false,
    });
    const [conversations, setConversations] = React.useState<IConversation[]>(
        []
    );

    const handleDeleteConversation = async (conversationId: string) => {
        try {
            setLoading(true);
            const response = await fetchApi(`conversations/${conversationId}`, {
                method: 'DELETE',
                signal: new AbortController().signal,
            });
            
            const result = await response.json().catch(() => ({ success: false, message: 'Unknown error' }));
            
            if (response.ok && result.success !== false) {
                // Remove from local state immediately for better UX
                setConversations(prev => prev.filter(c => c.id !== conversationId));
                
                // CRITICAL FIX: Clear related localStorage caches to prevent state inconsistency
                localStorage.removeItem(`conv_messages_${conversationId}`);
                localStorage.removeItem(`conv_charts_${conversationId}`);
                localStorage.removeItem(`conv_progress_${conversationId}`);
                localStorage.removeItem(`conv_has_data_source_${conversationId}`);
                
                // Check if this was the current conversation
                const currentConvId = localStorage.getItem('current_conversation_id');
                if (currentConvId === conversationId) {
                    localStorage.removeItem('current_conversation_id');
                }
                
                // Refresh list to ensure consistency
                await fetchConversations(0, true);
                // Show success message
                console.log('✅ Conversation deleted successfully');
                antMessage.success(result.message || 'Conversation deleted successfully');
            } else {
                // Show error message
                const errorMsg = result.message || result.detail || result.error || 'Failed to delete conversation';
                console.error('❌ Failed to delete conversation:', errorMsg);
                antMessage.error(errorMsg);
            }
        } catch (error) {
            console.error('❌ Error deleting conversation:', error);
            antMessage.error('Failed to delete conversation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRenameConversation = async (conversationId: string, newName: string) => {
        try {
            const response = await fetchApi(`conversations/${conversationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newName }),
                signal: new AbortController().signal,
            });
            
            if (response.ok) {
                // Update local state
                setConversations(prev => prev.map(c => 
                    c.id === conversationId ? { ...c, title: newName } : c
                ));
            } else {
                console.error('Failed to rename conversation');
            }
        } catch (error) {
            console.error('Error renaming conversation:', error);
        }
    };

    const fetchConversations = async (newOffset = 0, isInitialLoad = false): Promise<void> => {
        setLoading(true);
        // Only clear conversations if it's a fresh load (newOffset === 0)
        if (newOffset === 0) {
            setConversations([]);
        }

        // Use the passed newOffset, or current pagination offset if not provided for subsequent loads
        const currentOffset = newOffset;
        const currentLimit = pagination.limit;

        setPagination(prev => ({
            ...prev,
            offset: currentOffset,
        }));

        try {
            const response = await fetchApi(
                `conversations/?offset=${currentOffset}&limit=${currentLimit}`,
                {
                    signal: new AbortController().signal,
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch conversations');
            }
            
            const data = await response.json();
            const newItems = data.items || [];
            
            if (currentOffset === 0) {
                // Remove duplicates by ID
                const uniqueItems = Array.from(
                    new Map(newItems.map((item: IConversation) => [item.id, item])).values()
                );
                setConversations(uniqueItems);
            } else {
                setConversations((prevConversations: IConversation[]) => {
                    // Create a map to track existing IDs
                    const existingIds = new Set(prevConversations.map(c => c.id));
                    // Only add items that don't already exist
                    const newUniqueItems = newItems.filter((item: IConversation) => !existingIds.has(item.id));
                    return prevConversations.concat(newUniqueItems);
                });
            }
            setPagination(data.pagination || { has_more: false, offset: 0, limit: 10, total: 0 });
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            // Set empty conversations instead of failing
            if (currentOffset === 0) {
                setConversations([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const { containerRef, handleScroll } = useInfiniteScroll({
        loading,
        hasMore: pagination.has_more,
        onFetch: fetchConversations,
        currentItems: conversations,
    });

    React.useEffect(() => {
        // Initial load only
        fetchConversations(0, true);
    }, []); // Only run once on mount

    // Prevent duplicate conversations - only add current if it doesn't exist
    React.useEffect(() => {
        if (props.current?.id && conversations.length > 0) {
            const exists = conversations.some(
                (conv: IConversation) => conv.id === props.current?.id
            );
            if (!exists && props.current) {
                // Only add if it doesn't exist and we have conversations loaded
                setConversations((prevConversations: IConversation[]) => {
                    // Check again to prevent race conditions
                    const alreadyExists = prevConversations.some(c => c.id === props.current?.id);
                    if (alreadyExists) return prevConversations;
                    return [props.current, ...prevConversations];
                });
            }
        }
    }, [props.current?.id]); // Only depend on the ID, not the whole conversations array

    return (
        <div className="ChatHistoryPanel">
            {/* New conversation button removed - handled by CollapsibleHistoryPanel */}
            <div
                ref={containerRef}
                className="ChatHistoryContainer"
                onScroll={handleScroll}
            >
                {conversations?.map((conv: IConversation) => (
                    <ChatHistoryItem
                        key={conv.id}
                        onClick={() => {
                            props.onClick(conv);
                        }}
                        id={conv.id || ''}
                        name={conv.title || 'Untitled Conversation'}
                        isSelected={conv.id === props.id}
                        onNameChange={(newName: string) => {
                            // Real-time rename via API
                            handleRenameConversation(conv.id, newName);
                        }}
                        onDelete={handleDeleteConversation}
                    />
                ))}
            </div>
            {/* <div className={styles.ChatHistoryFooter}>
        <div style={{ width: "100%", height: "10px" }} />
      </div> */}
        </div>
    );
};

export default ChatHistoryPanel;
