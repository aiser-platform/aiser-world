import { IFileUpload } from '@/app/components/FileUpload/types';
import { fetchApi } from '@/utils/api';
import { SendOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import React from 'react';
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
const CHAT_LOADING_MESSAGE = 'AI Is Thinking';
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
}

const ChatPanel: React.FC<ChatPanelProps> = (props) => {
    const [loading, setLoading] = React.useState(false); // Loading state

    const [prompt, setPrompt] = React.useState<string>('');
    const [messages, setMessages] = React.useState<Array<IChatMessage>>([]);
    const [messageCache, setMessageCache] = React.useState<{
        [key: string]: {
            messages: IChatMessage[];
            conversation: IConversation;
            pagination: Pagination;
        };
    }>({});

    const [conversation, setConversation] =
        React.useState<IConversation | null>(null);

    const [pagination, setPagination] = React.useState<Pagination>({
        offset: 0,
        total_pages: 0,
        limit: LIMIT,
        total: 0,
        current_page: 0,
        has_more: false,
    });

    const [chatLoading, setChatLoading] = React.useState<boolean>(false);

    const containerRef = React.useRef<null | HTMLDivElement>(null);
    const textAreaRef = React.useRef<null | HTMLTextAreaElement>(null);

    /**
     * The function `containerToBottom` scrolls a container element to the bottom.
     */
    const containerToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    };

    const abortControllerRef = React.useRef<AbortController | null>(null);
    const activeRequestRef = React.useRef<string | null>(null);

    const fetchConversationMessages = React.useCallback(
        async (_conversationId: string, _offset = 0) => {
            // Prevent duplicate requests
            const requestKey = `${_conversationId}-${_offset}`;
            if (activeRequestRef.current === requestKey) {
                return;
            }

            if (!_conversationId) return;

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Handle cache
            if (_offset === 0 && messageCache[_conversationId]) {
                const cached = messageCache[_conversationId];
                setMessages(cached.messages);
                setConversation(cached.conversation);
                setPagination(cached.pagination);

                if (cached.conversation?.json_metadata) {
                    const metadata = JSON.parse(
                        cached.conversation.json_metadata as string
                    );
                    props.onFileChange?.(metadata.datasource?.file);
                }
                return;
            }

            setLoading(true);
            activeRequestRef.current = requestKey;
            abortControllerRef.current = new AbortController();

            try {
                await fetchApi(
                    `conversations/${_conversationId}?limit=${pagination.limit}&offset=${_offset}`,
                    {
                        signal: abortControllerRef.current.signal,
                    }
                ).then((response) => {
                    if (!response.ok)
                        throw new Error(
                            'Failed to fetch conversation messages'
                        );

                    response.json().then((data) => {
                        if (_offset === 0) {
                            setMessages(data.messages);
                            setConversation(data.conversation);

                            if (data.conversation?.json_metadata) {
                                props.onFileChange?.(
                                    JSON.parse(data.conversation.json_metadata)
                                        .datasource?.file
                                );
                            }

                            setMessageCache((prev) => ({
                                ...prev,
                                [_conversationId]: {
                                    messages: data.messages,
                                    conversation: data.conversation,
                                    pagination: data.pagination,
                                },
                            }));
                        } else {
                            setMessages((prevMessages: Array<IChatMessage>) =>
                                prevMessages.concat(data.messages)
                            );
                            setMessageCache((prev) => ({
                                ...prev,
                                [_conversationId]: {
                                    messages: prev[
                                        _conversationId
                                    ].messages.concat(data.messages),
                                    conversation:
                                        prev[_conversationId].conversation,
                                    pagination: data.pagination,
                                },
                            }));
                        }
                        setPagination(data.pagination);
                    });
                });
            } catch (error) {
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
                activeRequestRef.current = null;
            }
        },
        [messageCache, pagination.limit, props]
    );

    const addMessage = React.useCallback((message: IChatMessage) => {
        setMessages((prevMessages: Array<IChatMessage>) =>
            [message].concat(prevMessages)
        );
    }, []);

    const deleteMessage = React.useCallback((id: string) => {
        setMessages((prevMessages: Array<IChatMessage>) =>
            prevMessages.filter((msg: IChatMessage) => msg.id !== id)
        );
    }, []);

    // const { containerRef, handleScroll } = useReverseInfiniteScroll({
    //     loading,
    //     hasMore: pagination.has_more,
    //     onFetch: (offset: number) => {
    //         fetchConversationMessages(props.id, offset);
    //     },
    //     currentItems: messages,
    // });

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, offsetHeight } = event.currentTarget;

        const scrollPosition = Math.abs(scrollTop);
        const scrollPercentage = (scrollPosition + offsetHeight) / scrollHeight;
        const SCROLL_THRESHOLD = 0.8;

        if (scrollPercentage > SCROLL_THRESHOLD) {
            if (!loading && pagination.has_more) {
                fetchConversationMessages(
                    props.id,
                    pagination.offset + pagination.limit
                );
            }
        }
    };

    const chatToAI = (_prompt: string) => {
        if (!_prompt) {
            return;
        }
        setPrompt('');

        setChatLoading(true);

        const payload = new IChatPrompt({
            prompt: _prompt,
            conversation_id: props.id,
            history: messages
                .filter((msg) => !msg.id.startsWith('error'))
                .slice(0, 5),
            json_metadata: {
                datasource: {
                    data_type: DataType.FILE,
                    file: props.file ? props.file : undefined,
                },
            },
        });

        // Add user message to the chat
        addMessage({
            id: `loading`,
            query: _prompt,
            answer: CHAT_LOADING_MESSAGE,
        });

        containerToBottom();

        fetchApi(`chats/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then((response) => {
                if (!response.ok)
                    throw new Error('Failed to process your request');
                response.json().then((data) => {
                    const ms = data.message;
                    if (!props.id) {
                        props.callback(data);
                        setConversation(data.conversation);
                    }
                    addMessage(ms);
                    setPagination((prev) => ({
                        ...prev,
                        total_items: prev.total + 1,
                    }));
                });
            })
            .catch(() => {
                addMessage({
                    id: `error-${shortid.generate()}`,
                    query: _prompt,
                    answer: 'Sorry, I could not process your request.',
                });
            })
            .finally(() => {
                deleteMessage('loading');
                setChatLoading(false);
                containerToBottom();
                textAreaRef.current?.focus();
            });
    };

    React.useEffect(() => {
        if (!props.id || !conversation?.id) {
            // setDb(null);
            props.onDefaultDbChange?.(undefined);
            props.onDefaultSchemaChange?.(undefined);
            props.onDefaultTablesChange?.([]);
            props.onFileChange?.(undefined);
            setConversation(null);
            setPrompt('');
            setMessages([]);
        }
        if (props.id !== conversation?.id && props.id !== null) {
            // setDb(null);
            // setSchema(null);
            props.onDefaultDbChange?.(undefined);
            props.onDefaultSchemaChange?.(undefined);
            props.onDefaultTablesChange?.([]);
            props.onFileChange?.(undefined);
            fetchConversationMessages(props.id);
        }
        // window.addEventListener('scroll', handleScroll);

        // Cleanup event listener on unmount
        // return () => window.removeEventListener('scroll', handleScroll);
    }, [props.id, conversation?.id]);

    // React.useEffect(() => {
    //   containerToBottom();
    // });

    // const saveChart = (chart: IMessageChartResponse) => {
    //   if (chart) {
    //     // SupersetClient.post({
    //     //   endpoint: "/api/v1/chat_to_chart/save_chart",
    //     //   headers: { "Content-Type": "application/json" },
    //     //   body: JSON.stringify({
    //     //     title: chart?.title,
    //     //     form_data: JSON.stringify(JSON.parse(chart?.form_data)),
    //     //     viz_type: chart?.chart_type,
    //     //   }),
    //     // }).then(({ json }) => {
    //     //   if (json.result.id) {
    //     //     window.open(`/explore/?slice_id=${json.result.id}`, "_blank");
    //     //     // window. = `/explore/?slice_id=${json.id}`;
    //     //   }
    //     // });
    //   }
    // };

    // const chartMessageButtons = (
    //   chart: IMessageChartResponse
    // ): MenuProps["items"] => [
    //   {
    //     label: "Save Chart",
    //     key: "save_chart",
    //     onClick: () => {
    //       saveChart(chart);
    //     },
    //   },
    //   {
    //     label: (
    //       // <ModalTrigger
    //       //   triggerNode={
    //       //     <span data-test="view-query-menu-item">{t("View query")}</span>
    //       //   }
    //       //   modalTitle={t("View Query")}
    //       //   modalBody={
    //       //     <ViewQueryModal latestQueryFormData={JSON.parse(chart.form_data)} />
    //       //   }
    //       //   draggable
    //       //   resizable
    //       //   responsive
    //       // />
    //       <span>View Query</span>
    //     ),
    //     key: "view_query",
    //   },
    //   {
    //     key: "view_metadata",
    //     label: "View Metadata",
    //   },
    // ];

    const messageBoxMap = React.useMemo(
        () =>
            messages.map((message) => (
                <ChatMessageBox
                    key={message.id}
                    // message={message.content!}
                    query={message.query}
                    answer={message.answer}
                    id={message.id}

                    // disableAvatar={message.role === 'assistant'}
                />
            )),
        [messages]
    );

    return (
        <div className="ChatPanel" key={props.id!}>
            <div className="ChatHeader">
                <div className="ChatTitle">
                    {conversation?.title || 'Untitled Conversation'}
                </div>
            </div>
            <div className="Loading">{loading && 'Loading...'}</div>
            <div
                key={props.id}
                className="ContainerMessage"
                ref={containerRef}
                onScroll={handleScroll}
            >
                {/* <ChatMessageBox
                    id="testing-chart"
                    query={'Test Chart'}
                    answer={`<iframe 
                src="http://localhost:3000/embedded/chart/7cd47e0e-15e2-4a39-a34d-081303ce6241" 
                title="Example"            
            />`}
                /> */}
                {messageBoxMap}
            </div>
            <div className="ChatInput">
                <TextArea
                    ref={textAreaRef}
                    autoSize={{ minRows: 1, maxRows: 6 }}
                    size="large"
                    value={prompt}
                    disabled={chatLoading}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            chatToAI(prompt);
                        }
                    }}
                    autoFocus={true || !chatLoading}
                />
                <div
                    style={{
                        margin: '4px 8px',
                    }}
                >
                    <Button
                        loading={chatLoading}
                        onClick={() => {
                            chatToAI(prompt);
                        }}
                    >
                        <SendOutlined />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
