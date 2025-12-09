'use client';

import React, { useState } from 'react';
import { Select, Space, Tooltip, Tag } from 'antd';
import { 
    SettingOutlined, 
    ThunderboltOutlined, 
    ExperimentOutlined,
    RocketOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import './InlineModeSelector.css';

const { Option } = Select;

interface InlineModeSelectorProps {
    currentMode: string;
    onModeChange: (mode: string) => void;
    currentModel?: string;
    onModelChange?: (model: string) => void;
    className?: string;
    isCompact?: boolean;
    availableModels?: any[];
    hideModelSelector?: boolean;
}

const InlineModeSelector: React.FC<InlineModeSelectorProps> = ({
    currentMode,
    onModeChange,
    currentModel = 'azure_gpt5_mini',
    onModelChange,
    className = '',
    isCompact = false,
    availableModels = [],
    hideModelSelector = false
}) => {
    const modes = [
        {
            key: 'standard',
            title: 'Standard',
            description: 'Fast, efficient analysis with basic insights',
            icon: <ThunderboltOutlined />,
            color: '#1890ff',
            recommended: true
        },
        {
            key: 'deep',
            title: 'Deep Analysis',
            description: 'Comprehensive analysis with advanced reasoning - Coming Soon',
            icon: <ExperimentOutlined />,
            color: '#722ed1',
            recommended: false,
            disabled: true,
            comingSoon: true
        }
    ];

    const models = availableModels.length > 0 ? availableModels.map(model => ({
        key: model.id,
        name: model.name,
        provider: model.provider,
        color: model.provider === 'azure' ? 'blue' : model.provider === 'openai' ? 'green' : 'purple',
        description: model.description
    })) : [
        {
            key: 'azure_gpt5_mini',
            name: 'GPT-5 Mini (Azure)',
            provider: 'Azure',
            color: 'blue',
            description: 'Advanced reasoning model'
        },
        {
            key: 'azure_gpt41_mini',
            name: 'GPT-4.1 Mini (Azure)',
            provider: 'Azure',
            color: 'blue',
            description: 'Fast and reliable model'
        },
        {
            key: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'OpenAI',
            color: 'green',
            description: 'Standard model'
        }
    ];

    const currentModeData = modes.find(m => m.key === currentMode);
    const currentModelData = models.find(m => m.key === currentModel);

    const handleModeChange = (value: any) => {
        const modeKey = typeof value === 'object' ? value.value : value;
        onModeChange(modeKey);
    };

    const handleModelChange = (value: any) => {
        const modelKey = typeof value === 'object' ? value.value : value;
        onModelChange?.(modelKey);
    };

    return (
        <div className={`inline-mode-selector ${className} ${isCompact ? 'compact-mode' : ''}`}>
            <Space size="small" wrap>
                {/* Mode Selector */}
                <Tooltip title="Select Analysis Mode">
                    <Select
                        labelInValue
                        value={currentModeData ? { 
                            value: currentModeData.key, 
                            label: (
                                <Space size={4}>
                                    <span style={{ color: currentModeData.color }}>
                                        {currentModeData.icon}
                                    </span>
                                    <span>{currentModeData.title}</span>
                                    {currentModeData.recommended && (
                                        <Tag color="green">Rec</Tag>
                                    )}
                                </Space>
                            )
                        } : undefined}
                        onChange={handleModeChange}
                        style={{ minWidth: isCompact ? 140 : 160 }}
                        popupMatchSelectWidth={false}
                        placeholder="Select Mode"
                        optionLabelProp="label"
                    >
                        {modes.map(mode => (
                            <Option 
                                key={mode.key} 
                                value={mode.key}
                                disabled={mode.disabled}
                                label={
                                    <Space size={4}>
                                        <span style={{ color: mode.color }}>
                                            {mode.icon}
                                        </span>
                                        <span>{mode.title}</span>
                                        {mode.recommended && (
                                            <Tag color="green">Rec</Tag>
                                        )}
                                        {mode.comingSoon && (
                                            <Tag color="orange">Soon</Tag>
                                        )}
                                    </Space>
                                }
                            >
                                <div style={{ padding: '4px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ color: mode.color }}>
                                            {mode.icon}
                                        </span>
                                        <span style={{ fontWeight: 500 }}>{mode.title}</span>
                                        {mode.recommended && (
                                            <Tag color="green">Recommended</Tag>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 24 }}>
                                        {mode.description}
                                    </div>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </Tooltip>

                {/* Model Selector */}
                {!hideModelSelector && (
                    <Tooltip title="Select AI Model">
                        <Select
                            labelInValue
                            value={currentModelData ? { 
                                value: currentModelData.key, 
                                label: (
                                    <Space size={4}>
                                        <Tag color={currentModelData.color}>
                                            {currentModelData.provider}
                                        </Tag>
                                        <span>{currentModelData.name}</span>
                                    </Space>
                                )
                            } : undefined}
                            onChange={handleModelChange}
                            style={{ minWidth: isCompact ? 120 : 140 }}
                            popupMatchSelectWidth={false}
                            placeholder="Select Model"
                            optionLabelProp="label"
                        >
                            {models.map(model => (
                                <Option 
                                    key={model.key} 
                                    value={model.key}
                                    label={
                                        <Space size={4}>
                                            <Tag color={model.color}>
                                                {model.provider}
                                            </Tag>
                                            <span>{model.name}</span>
                                        </Space>
                                    }
                                >
                                    <div style={{ padding: '4px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Tag color={model.color}>
                                                {model.provider}
                                            </Tag>
                                            <span style={{ fontWeight: 500 }}>{model.name}</span>
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Tooltip>
                )}

                {/* Info Tooltip */}
                <Tooltip title="Click to learn more about analysis modes and AI models">
                    <InfoCircleOutlined 
                        style={{ 
                            color: 'var(--color-text-secondary, #8c8c8c)',
                            cursor: 'help',
                            fontSize: 14
                        }} 
                    />
                </Tooltip>
            </Space>
        </div>
    );
};

export default InlineModeSelector;
