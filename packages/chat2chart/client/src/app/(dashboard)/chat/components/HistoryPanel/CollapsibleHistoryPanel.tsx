'use client';

import React, { useState } from 'react';
import { Button, Typography, Space, Tooltip } from 'antd';
import { 
    HistoryOutlined, 
    PlusOutlined, 
    ExpandOutlined, 
    CompressOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { IConversation } from '../../types';
import ChatHistoryPanel from './HistoryPanel';
import './styles.css';

const { Title } = Typography;

interface CollapsibleHistoryPanelProps {
    id?: string;
    current?: IConversation;
    collapsed?: boolean;
    onClick: (props: IConversation) => void;
    onCollapsedChange?: (collapsed: boolean) => void;
    onNewChat?: () => void;
}

const CollapsibleHistoryPanel: React.FC<CollapsibleHistoryPanelProps> = ({
    id,
    current,
    collapsed = false,
    onClick,
    onCollapsedChange,
    onNewChat
}) => {
    if (collapsed) {
        return (
            <div className="history-panel-collapsed">
                <div className="collapsed-controls">
                    <Tooltip title="Expand" placement="right">
                        <Button
                            type="text"
                            icon={<ExpandOutlined />}
                            onClick={() => onCollapsedChange?.(false)}
                            style={{ width: '100%' }}
                        />
                    </Tooltip>
                    <Tooltip title="New Conversation" placement="right">
                        <Button
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={onNewChat}
                            style={{ width: '100%' }}
                        />
                    </Tooltip>
                </div>
            </div>
        );
    }

    return (
        <div className="collapsible-history-panel">
            <div className="history-panel-header">
                <Space>
                    <MessageOutlined />
                    <Title level={5} style={{ margin: 0 }}>Chat History</Title>
                </Space>
                <Space>
                    <Tooltip title="New Conversation">
                        <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={onNewChat}
                        />
                    </Tooltip>
                    <Tooltip title="Collapse">
                        <Button
                            type="text"
                            size="small"
                            icon={<CompressOutlined />}
                            onClick={() => onCollapsedChange?.(true)}
                        />
                    </Tooltip>
                </Space>
            </div>
            
            <div className="history-panel-content">
                <ChatHistoryPanel
                    id={id}
                    current={current}
                    onClick={onClick}
                />
            </div>
        </div>
    );
};

export default CollapsibleHistoryPanel;