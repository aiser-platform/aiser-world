'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dropdown, Button, List, Typography, Space, Tooltip, Popconfirm, Input, message as antMessage, Empty, Spin, Grid } from 'antd';
import { HistoryOutlined, PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { IConversation } from '../../types';
import { useConversations } from '@/context/ConversationContext';
import './styles.css'; // Import styles for consistent scrollbar design

const { Text } = Typography;

interface SessionHistoryDropdownProps {
    currentConversationId?: string | null;
    onSelectConversation: (conversation: IConversation) => void;
    onNewConversation: () => void;
    onConversationDeleted?: () => void;
}

const SessionHistoryDropdown: React.FC<SessionHistoryDropdownProps> = ({
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onConversationDeleted
}) => {
    const screens = Grid.useBreakpoint();
    const dropdownWidth = screens.lg ? 320 : 'min(360px, 92vw)';
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState<string>('');

    // Get conversation state from context
    const { conversations: contextConversations, isLoading, deleteConversation, updateConversationMetadata } = useConversations();
    
    // Sort conversations by updated_at (most recent first)
    const conversations = [...contextConversations].sort((a: IConversation, b: IConversation) => {
        const aTime = new Date((a as any).updated_at || (a as any).created_at || 0).getTime();
        const bTime = new Date((b as any).updated_at || (b as any).created_at || 0).getTime();
        return bTime - aTime;
    });
    
    const loading = isLoading;

    // Handle delete conversation - use context
    const handleDelete = async (conversationId: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        
        try {
            await deleteConversation(conversationId);
            
            // CRITICAL FIX: Clear related localStorage caches
            localStorage.removeItem(`conv_messages_${conversationId}`);
            localStorage.removeItem(`conv_charts_${conversationId}`);
            localStorage.removeItem(`conv_progress_${conversationId}`);
            localStorage.removeItem(`conv_has_data_source_${conversationId}`);
            
            antMessage.success('Conversation deleted successfully');
            
            // If deleted conversation was current, notify parent
            if (conversationId === currentConversationId) {
                onConversationDeleted?.();
            }
        } catch (error) {
            console.error('❌ Error deleting conversation:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to delete conversation';
            antMessage.error(errorMsg);
        }
    };

    // Handle rename conversation - use context
    const handleRename = async (conversationId: string, newName: string) => {
        if (!newName.trim()) {
            setEditingId(null);
            return;
        }

        try {
            // Use context to update - it will handle API call and state update
            await updateConversationMetadata(conversationId, { title: newName.trim() });
            
            setEditingId(null);
            antMessage.success('Conversation renamed');
        } catch (error) {
            console.error('Error renaming conversation:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to rename conversation';
            antMessage.error(errorMsg);
        }
    };

    // Start editing
    const startEdit = (conversation: IConversation, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setEditingId(conversation.id || null);
        setEditName(conversation.title || 'Untitled Conversation');
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    // Save edit
    const saveEdit = (conversationId: string) => {
        handleRename(conversationId, editName);
    };

    const dropdownContent = (
        <div style={{ 
            width: dropdownWidth,
            maxHeight: '500px',
            backgroundColor: 'var(--ant-color-bg-container)',
            borderRadius: '8px',
            boxShadow: 'var(--ant-box-shadow-base)'
        }}>
            <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid var(--ant-color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Text strong style={{ fontSize: '14px' }}>Chat Sessions</Text>
                <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setOpen(false);
                        onNewConversation();
                    }}
                >
                    New
                </Button>
            </div>
            
            <div 
                className="session-history-scroll"
                style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto',
                    padding: '4px 0'
                }}
            >
                {loading && conversations.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <Spin />
                    </div>
                ) : conversations.length === 0 ? (
                    <Empty 
                        description="No chat sessions yet"
                        style={{ padding: '20px' }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <List
                        dataSource={conversations}
                        renderItem={(conversation) => {
                            const isCurrent = conversation.id === currentConversationId;
                            const isEditing = editingId === conversation.id;
                            
                            return (
                                <List.Item
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: isCurrent ? 'var(--ant-color-primary-bg)' : 'transparent',
                                        borderLeft: isCurrent ? '3px solid var(--ant-color-primary)' : '3px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => {
                                        if (!isEditing) {
                                            setOpen(false);
                                            onSelectConversation(conversation);
                                        }
                                    }}
                                >
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        gap: '8px'
                                    }}>
                                        {isEditing ? (
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onPressEnter={() => saveEdit(conversation.id!)}
                                                onBlur={() => saveEdit(conversation.id!)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        cancelEdit();
                                                    }
                                                }}
                                                autoFocus
                                                size="small"
                                                style={{ flex: 1 }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <Text 
                                                ellipsis 
                                                style={{ 
                                                    flex: 1,
                                                    fontWeight: isCurrent ? 600 : 400,
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {conversation.title || 'Untitled Conversation'}
                                            </Text>
                                        )}
                                        
                                        {!isEditing && (
                                            <Space size={4} onClick={(e) => e.stopPropagation()}>
                                                <Tooltip title="Rename">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={(e) => startEdit(conversation, e)}
                                                        style={{ opacity: 0.6 }}
                                                    />
                                                </Tooltip>
                                                <Popconfirm
                                                    title="Delete this conversation?"
                                                    description="This action cannot be undone."
                                                    onConfirm={(e) => {
                                                        if (e) e.stopPropagation();
                                                        handleDelete(conversation.id!, e);
                                                    }}
                                                    onCancel={(e) => {
                                                        if (e) e.stopPropagation();
                                                    }}
                                                    okText="Delete"
                                                    cancelText="Cancel"
                                                    okButtonProps={{ danger: true }}
                                                    placement="topRight"
                                                >
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        style={{ opacity: 0.6 }}
                                                    />
                                                </Popconfirm>
                                            </Space>
                                        )}
                                        
                                        {isEditing && (
                                            <Space size={4} onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CheckOutlined />}
                                                    onClick={() => saveEdit(conversation.id!)}
                                                    style={{ color: 'var(--ant-color-success)' }}
                                                />
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CloseOutlined />}
                                                    onClick={cancelEdit}
                                                />
                                            </Space>
                                        )}
                                    </div>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </div>
        </div>
    );

    return (
        <Dropdown
            open={open}
            onOpenChange={setOpen}
            dropdownRender={() => dropdownContent}
            placement={screens.lg ? 'bottomRight' : 'bottom'}
            overlayStyle={{ minWidth: 0 }}
            trigger={['click']}
        >
            <Tooltip title="Chat Sessions" placement="bottom">
                <Button
                    type="text"
                    size="small"
                    icon={<HistoryOutlined />}
                    style={{ 
                        color: currentConversationId ? 'var(--ant-color-primary)' : 'var(--ant-color-text-secondary)'
                    }}
                />
            </Tooltip>
        </Dropdown>
    );
};

export default SessionHistoryDropdown;

