'use client';

import React, { useState, useEffect } from 'react';
import { 
    Select, 
    Card, 
    Space, 
    Tag, 
    Button, 
    Tooltip, 
    Alert, 
    Spin,
    Typography,
    Badge,
    message
} from 'antd';
import { 
    ExperimentOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    DollarOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface Model {
    id: string;
    name: string;
    provider: string;
    cost_per_1k_tokens: number;
    available: boolean;
}

interface ModelSelectorProps {
    onModelChange?: (modelId: string) => void;
    showCostInfo?: boolean;
    compact?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    onModelChange,
    showCostInfo = true,
    compact = false
}) => {
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [testingModel, setTestingModel] = useState<string | null>(null);
    const [modelStatus, setModelStatus] = useState<{[key: string]: any}>({});

    useEffect(() => {
        loadAvailableModels();
    }, []);

    const loadAvailableModels = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/ai/models');
            const data = await response.json();
            
            if (data.success) {
                setModels(data.models);
                setSelectedModel(data.default_model);
                
                // Test all available models
                for (const model of data.models) {
                    if (model.available) {
                        testModelConnection(model.id);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            message.error('Failed to load available AI models');
        } finally {
            setLoading(false);
        }
    };

    const testModelConnection = async (modelId: string) => {
        setTestingModel(modelId);
        try {
            const response = await fetch(`http://localhost:8000/ai/model-status?model_id=${modelId}`);
            const data = await response.json();
            
            setModelStatus(prev => ({
                ...prev,
                [modelId]: data
            }));
        } catch (error) {
            console.error(`Failed to test model ${modelId}:`, error);
            setModelStatus(prev => ({
                ...prev,
                [modelId]: { success: false, error: 'Connection failed' }
            }));
        } finally {
            setTestingModel(null);
        }
    };

    const handleModelChange = async (modelId: string) => {
        try {
            const response = await fetch('http://localhost:8000/ai/set-default-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: modelId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSelectedModel(modelId);
                onModelChange?.(modelId);
                message.success(`Switched to ${data.model_name}`);
            } else {
                message.error(data.error || 'Failed to switch model');
            }
        } catch (error) {
            console.error('Failed to change model:', error);
            message.error('Failed to change AI model');
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'azure': return 'blue';
            case 'openai': return 'green';
            default: return 'default';
        }
    };

    const getStatusIcon = (modelId: string) => {
        const status = modelStatus[modelId];
        if (testingModel === modelId) {
            return <Spin size="small" />;
        }
        if (status?.success) {
            return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        }
        if (status && !status.success) {
            return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
        }
        return null;
    };

    const renderModelOption = (model: Model) => (
        <Option key={model.id} value={model.id} disabled={!model.available}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Text strong={selectedModel === model.id}>
                        {model.name}
                    </Text>
                    <Tag color={getProviderColor(model.provider)}>
                        {model.provider?.toUpperCase() || 'UNKNOWN'}
                    </Tag>
                    {showCostInfo && (
                        <Tag icon={<DollarOutlined />}>
                            ${model.cost_per_1k_tokens.toFixed(4)}/1K
                        </Tag>
                    )}
                </Space>
                <Space>
                    {getStatusIcon(model.id)}
                    {!model.available && (
                        <Tag color="red">Not Available</Tag>
                    )}
                </Space>
            </div>
        </Option>
    );

    if (compact) {
        return (
            <Select
                value={selectedModel}
                onChange={handleModelChange}
                loading={loading}
                style={{ minWidth: 200 }}
                placeholder="Select AI Model"
            >
                {models.map(renderModelOption)}
            </Select>
        );
    }

    return (
        <Card 
            title={
                <Space>
                    <ExperimentOutlined />
                    AI Model Selection
                </Space>
            }
            size="small"
            extra={
                <Button 
                    size="small" 
                    onClick={loadAvailableModels}
                    loading={loading}
                    icon={<ThunderboltOutlined />}
                >
                    Refresh
                </Button>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                    value={selectedModel}
                    onChange={handleModelChange}
                    loading={loading}
                    style={{ width: '100%' }}
                    placeholder="Select AI Model"
                    dropdownRender={menu => (
                        <div>
                            {menu}
                            {showCostInfo && (
                                <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        💡 Costs shown are per 1,000 tokens. GPT-4o Mini is most cost-effective.
                                    </Text>
                                </div>
                            )}
                        </div>
                    )}
                >
                    {models.map(renderModelOption)}
                </Select>

                {selectedModel && (
                    <div>
                        <Text type="secondary">Current Model: </Text>
                        <Badge 
                            status={modelStatus[selectedModel]?.success ? 'success' : 'error'} 
                            text={
                                models.find(m => m.id === selectedModel)?.name || selectedModel
                            }
                        />
                    </div>
                )}

                {models.some(m => !m.available) && (
                    <Alert
                        message="Some models are not available"
                        description="Configure API keys in environment variables to enable all models"
                        type="warning"
                        showIcon
                    />
                )}
            </Space>
        </Card>
    );
};

export default ModelSelector;