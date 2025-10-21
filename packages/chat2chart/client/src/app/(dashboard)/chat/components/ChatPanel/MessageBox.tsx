'use client';

// import { EmbeddedChartComponent } from '@/components/EmbeddedChart';
import {
    CommentOutlined,
    DislikeOutlined,
    LikeOutlined,
    ReloadOutlined,
    RobotOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Tooltip, Badge } from 'antd';
import React from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingStates from '@/app/components/LoadingStates';
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

// AI Profile Component with animated avatar
const AIProfile: React.FC = () => (
    <div className="ai-profile">
        <Badge 
            count={<div className="ai-status-indicator" />} 
            offset={[-5, 5]}
        >
            <Avatar 
                size={40}
                style={{ 
                    backgroundColor: 'var(--color-brand-primary)',
                    border: '2px solid #40a9ff',
                    boxShadow: '0 0 10px rgba(24, 144, 255, 0.3)'
                }}
                icon={<RobotOutlined style={{ fontSize: '20px' }} />}
            />
        </Badge>
        <div className="ai-info">
            <div className="ai-name">AI Assistant</div>
            <div className="ai-status">Online</div>
        </div>
    </div>
);

// User Profile Component
const UserProfile: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    
    const handleProfileClick = () => {
        router.push('/settings/profile');
    };
    
    return (
        <div className="user-profile" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
            <Avatar 
                size={40}
                style={{ 
                    backgroundColor: 'var(--color-functional-success)',
                    border: '2px solid #73d13d'
                }}
                icon={<UserOutlined style={{ fontSize: '20px' }} />}
            />
            <div className="user-info">
                <div className="user-name">{user?.email?.split('@')[0] || 'You'}</div>
                <div className="user-email">{user?.email || 'user@example.com'}</div>
            </div>
        </div>
    );
};

export default function ChatMessageBox({
    id,
    // message,
    // isLike,
    // onAction,
    query,
    answer,
}: MessageBoxProps) {
    return (
        <div className="message-container">
            {answer && query && (
                <>
                    {/* User Message */}
                    <div
                        className="ContainerMessageBox justify-end"
                        key={`user-${id}`}
                    >
                        <div className="MessageBox justify-end">
                            <div className="Message user-message">
                                <Markdown>{query ?? ''}</Markdown>
                            </div>
                        </div>
                        <UserProfile />
                    </div>

                    {/* AI Message */}
                    <div
                        className="ContainerMessageBox justify-start"
                        key={`assistant-${id}`}
                    >
                        <AIProfile />
                        <div className={`MessageBox justify-start`}>
                            <div
                                className={`Message ai-message ${answer?.includes('<iframe') ? 'has-iframe' : ''}`}
                            >
                                {id === 'loading' || id.startsWith('error') ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                        {id === 'loading'
                                            ? <LoadingStates type="default" message="Processing..." size="small" />
                                            : <div style={{ color: 'var(--color-functional-error)', fontWeight: '500' }}>Error occurred</div>
                                        }
                                    </div>
                                ) : (
                                    <Markdown rehypePlugins={[rehypeRaw]}>
                                        {answer ?? ''}
                                    </Markdown>
                                )}
                            </div>
                        </div>
                    </div>
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
