'use client';

// import { EmbeddedChartComponent } from '@/components/EmbeddedChart';
import {
    CommentOutlined,
    DislikeOutlined,
    LikeOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Tooltip } from 'antd';
import React from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import './styles.css';

interface ChartButton {
    key: string;
    label: string | React.ReactNode;
    onClick?: () => void;
}

interface MessageBoxProps {
    id: string;
    message?: string | React.ReactNode;
    disableAvatar?: boolean;
    viz?: {
        id: string;
        result: string;
    };
    isLoading?: boolean;
    isLike?: boolean | null;
    onAction?: (action: 'like' | 'dislike' | 'comment' | 'regenerate') => void;
    chartButtons?: ChartButton[];
    query?: string;
    answer?: string;
}

// const Iframe = ({ src, title, ...props }: React.ComponentProps<'iframe'>) => {
//     return (
//         <div className="iframe-container">
//             <iframe src={src} title={title} allowFullScreen {...props} />
//         </div>
//     );
// };

export default function ChatMessageBox({
    id,
    // message,
    // isLike,
    // onAction,
    query,
    answer,
}: MessageBoxProps) {
    return (
        <div>
            {answer && query && (
                <>
                    <div
                        className="ContainerMessageBox justify-end "
                        key={`user-${id}`}
                    >
                        <div className="MessageBox justify-end">
                            <div className="Message">
                                <Markdown>{query ?? ''}</Markdown>
                            </div>
                        </div>
                        <Avatar
                            style={{
                                backgroundColor: '#f56a00',
                            }}
                        >
                            You
                        </Avatar>
                    </div>

                    <div
                        className="ContainerMessageBox justify-start"
                        key={`assistant-${id}`}
                    >
                        <Avatar style={{ backgroundColor: '#0891b2' }}>
                            AI
                        </Avatar>
                        <div className={`MessageBox justify-start`}>
                            <div
                                className={`Message ${answer?.includes('<iframe') ? 'has-iframe' : ''}`}
                            >
                                {id === 'loading' || id.startsWith('error') ? (
                                    <span
                                        className={
                                            id === 'loading'
                                                ? 'Loading'
                                                : 'Error'
                                        }
                                    >
                                        {answer}
                                    </span>
                                ) : (
                                    <Markdown rehypePlugins={[rehypeRaw]}>
                                        {answer ?? ''}
                                    </Markdown>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* <div className="ActionButtons">
                        <ActionButtons isLike={isLike} onAction={onAction} />
                    </div> */}
                </>
            )}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ActionButtons({
    isLike,
    onAction,
}: {
    isLike?: boolean | null;
    onAction?: (action: 'like' | 'dislike' | 'comment' | 'regenerate') => void;
}) {
    return (
        <>
            <Tooltip placement="bottom" title="Like">
                <Button
                    type="text"
                    onClick={() => onAction?.('like')}
                    className={isLike ? 'liked' : ''}
                >
                    <LikeOutlined />
                </Button>
            </Tooltip>
            <Tooltip placement="bottom" title="Dislike">
                <Button
                    type="text"
                    onClick={() => onAction?.('dislike')}
                    className={isLike === false ? 'disliked' : ''}
                >
                    <DislikeOutlined />
                </Button>
            </Tooltip>
            <Tooltip placement="bottom" title="Comment">
                <Button type="text" onClick={() => onAction?.('comment')}>
                    <CommentOutlined />
                </Button>
            </Tooltip>
            <Tooltip placement="bottom" title="Regenerate">
                <Button type="text" onClick={() => onAction?.('regenerate')}>
                    <ReloadOutlined />
                </Button>
            </Tooltip>
        </>
    );
}
