'use client';

import React from 'react';
import { Select, Tooltip } from 'antd';
import { BulbOutlined, LockOutlined } from '@ant-design/icons';

const { Option } = Select;

interface ModeSelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange, disabled = false }) => {
    return (
        <Select
            value={value}
            onChange={onChange}
            disabled={disabled}
            style={{ 
                width: 120,
                fontSize: '11px',
                height: '20px',
            }}
            size="small"
            styles={{
                popup: {
                    root: {
                        fontSize: '11px',
                        background: 'var(--layout-panel-background)',
                        border: '1px solid var(--color-border-primary)',
                        boxShadow: 'var(--shadow-md)',
                    }
                }
            }}
        >
            <Option 
                value="main"
                style={{
                    fontSize: '11px',
                    color: 'var(--color-text-primary)',
                    background: 'var(--layout-panel-background)',
                }}
            >
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4,
                    fontSize: '11px',
                    color: 'var(--color-text-primary)',
                }}>
                    <BulbOutlined style={{ fontSize: '10px' }} />
                    Main
                </div>
            </Option>
            <Option 
                value="deep-analysis" 
                disabled
                style={{
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                    background: 'var(--layout-panel-background)',
                }}
            >
                <Tooltip title="Coming Soon - Executive level data-driven decision making">
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4, 
                        opacity: 0.6,
                        fontSize: '11px',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        <LockOutlined style={{ fontSize: '10px' }} />
                        Deep Analysis
                        <span style={{ fontSize: '9px', color: 'var(--color-text-quaternary)' }}>(Soon)</span>
                    </div>
                </Tooltip>
            </Option>
        </Select>
    );
};

export default ModeSelector;