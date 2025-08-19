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
            style={{ width: 200 }}
            size="large"
        >
            <Option value="main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BulbOutlined />
                    Main
                </div>
            </Option>
            <Option value="deep-analysis" disabled>
                <Tooltip title="Coming Soon - Executive level data-driven decision making">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
                        <LockOutlined />
                        Deep Analysis
                        <span style={{ fontSize: '11px', color: '#999' }}>(Coming Soon)</span>
                    </div>
                </Tooltip>
            </Option>
        </Select>
    );
};

export default ModeSelector;