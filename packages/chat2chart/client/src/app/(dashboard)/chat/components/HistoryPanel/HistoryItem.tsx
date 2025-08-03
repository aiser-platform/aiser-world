import { Button, Tooltip } from 'antd';
import React from 'react';
import './styles.css';

interface ChatHistoryItemProps {
    onClick: () => void;
    id: string;
    name: string;
    isSelected?: boolean;
}

const ChatHistoryItem: React.FC<ChatHistoryItemProps> = (props) => (
    <div
        className={`ChatHistoryItem ${
            props.isSelected ? 'ChatHistoryItem--selected' : ''
        }`}
    >
        <Tooltip placement="right" title={props.name}>
            <Button onClick={() => props.onClick()} type="text" style={{}}>
                {props.name}
            </Button>
        </Tooltip>
    </div>
);

export default ChatHistoryItem;
