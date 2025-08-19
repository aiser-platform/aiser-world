import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Button } from 'antd';
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

    const fetchConversations = async (_offset = 0): Promise<void> => {
        setLoading(true);
        if (_offset === 0) setConversations([]);
        setPagination({
            offset: _offset,
            total_pages: 0,
            limit: 10,
            total: 0,
            current_page: 0,
            has_more: false,
        });

        try {
            const response = await fetchApi(
                `conversations/?offset=${_offset}&limit=${pagination.limit}`,
                {
                    signal: new AbortController().signal,
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch conversations');
            }
            
            const data = await response.json();
            if (_offset === 0) {
                setConversations(data.items || []);
            } else {
                setConversations((prevConversations: IConversation[]) =>
                    prevConversations.concat(data.items || [])
                );
            }
            setPagination(data.pagination || { has_more: false, offset: 0, limit: 10, total: 0 });
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            // Set empty conversations instead of failing
            if (_offset === 0) {
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
        return () => {
            fetchConversations();
        };
    }, []);

    React.useEffect(() => {
        if (props.current?.id) {
            if (conversations.length > 0) {
                const conversation = conversations.find(
                    (conversation: IConversation) =>
                        conversation.id === props.current?.id
                );
                if (!conversation) {
                    setConversations((prevConversations: IConversation[]) =>
                        props.current
                            ? [props.current].concat(prevConversations)
                            : prevConversations
                    );
                }
            } else {
                setConversations([props.current]);
            }
        }
    }, [conversations, props.current]);

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
                        name={conv.title}
                        isSelected={conv.id === props.id}
                        onNameChange={(newName: string) => {
                            // Update conversation title in localStorage
                            const savedConversations = localStorage.getItem('chat_conversations');
                            if (savedConversations) {
                                try {
                                    const conversations = JSON.parse(savedConversations);
                                    const updatedConversations = conversations.map((c: IConversation) => 
                                        c.id === conv.id ? { ...c, title: newName } : c
                                    );
                                    localStorage.setItem('chat_conversations', JSON.stringify(updatedConversations));
                                } catch (error) {
                                    console.error('Failed to update conversation title:', error);
                                }
                            }
                        }}
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
