import { Button, Tooltip, Input, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import './styles.css';

interface ChatHistoryItemProps {
    onClick: () => void;
    id: string;
    name: string;
    isSelected?: boolean;
    onNameChange?: (newName: string) => void;
    onDelete?: (id: string) => void;
}

const ChatHistoryItem: React.FC<ChatHistoryItemProps> = (props) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(props.name);

    const handleDoubleClick = () => {
        if (props.onNameChange) {
            setIsEditing(true);
        }
    };

    const handleSave = () => {
        if (props.onNameChange && editName.trim()) {
            props.onNameChange(editName.trim());
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditName(props.name);
        setIsEditing(false);
    };

    return (
        <div
            className={`ChatHistoryItem ${
                props.isSelected ? 'ChatHistoryItem--selected' : ''
            }`}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                backgroundColor: props.isSelected ? '#e6f7ff' : 'transparent',
                borderLeft: props.isSelected ? '3px solid #1890ff' : '3px solid transparent',
                paddingLeft: '8px'
            }}
        >
            {isEditing ? (
                <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onPressEnter={handleSave}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
                    autoFocus
                    size="small"
                    style={{ flex: 1 }}
                />
            ) : (
                <>
                    <Tooltip placement="right" title={props.name}>
                        <Button 
                            onClick={() => props.onClick()} 
                            onDoubleClick={handleDoubleClick}
                            type="text" 
                            style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                            {props.name}
                        </Button>
                    </Tooltip>
                    {props.onDelete && (
                        <Popconfirm
                            title="Delete this conversation?"
                            description={null}
                            onConfirm={() => props.onDelete?.(props.id)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true, type: 'primary', size: 'small' }}
                            cancelButtonProps={{ size: 'small' }}
                            placement="topRight"
                            overlayStyle={{ maxWidth: '200px' }}
                        >
                            <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                danger
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                style={{ 
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.7';
                                }}
                            />
                        </Popconfirm>
                    )}
                </>
            )}
        </div>
    );
};

export default ChatHistoryItem;
