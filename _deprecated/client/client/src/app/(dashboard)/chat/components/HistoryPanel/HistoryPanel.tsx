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

        await fetchApi(
            `conversations/?offset=${_offset}&limit=${pagination.limit}`,
            {
                signal: new AbortController().signal,
            }
        )
            .then((response) => {
                if (!response.ok)
                    throw new Error('Failed to fetch conversations');
                response.json().then((data) => {
                    if (_offset === 0) {
                        setConversations(data.items);
                    } else {
                        setConversations((prevConversations: IConversation[]) =>
                            prevConversations.concat(data.items)
                        );
                    }
                    setPagination(data.pagination);
                });
            })
            .finally(() => {
                setLoading(false);
            });
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
            <div className="ChatHistoryHeader">
                <Button
                    onClick={() =>
                        props.onClick({
                            id: null,
                            title: 'New chat',
                        })
                    }
                    type="primary"
                    style={{
                        width: '100%',
                    }}
                    shape="round"
                >
                    {'New chat'}
                </Button>
            </div>
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
