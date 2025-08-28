import { Button, Tooltip, Input } from 'antd';
import React, { useState } from 'react';
import './styles.css';

interface ChatHistoryItemProps {
    onClick: () => void;
    id: string;
    name: string;
    isSelected?: boolean;
    onNameChange?: (newName: string) => void;
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
                    style={{ width: '100%' }}
                />
            ) : (
                <Tooltip placement="right" title={props.name}>
                    <Button 
                        onClick={() => props.onClick()} 
                        onDoubleClick={handleDoubleClick}
                        type="text" 
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        {props.name}
                    </Button>
                </Tooltip>
            )}
        </div>
    );
};

export default ChatHistoryItem;
