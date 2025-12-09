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
    ThunderboltOutlined,
    SettingOutlined
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
    const [selectedModel, setSelectedModel] = useState<string>('auto'); // Default to 'auto'
    const [loading, setLoading] = useState(false);
    const [testingModel, setTestingModel] = useState<string | null>(null);
    const [modelStatus, setModelStatus] = useState<{[key: string]: any}>({});

    useEffect(() => {
        loadAvailableModels();
    }, []);

    const loadAvailableModels = async () => {
        setLoading(true);
        try {
            // Use frontend-friendly backend endpoint
            // Prefer the backend /ai/models endpoint (proxied via /api/ai/models)
            const response = await fetch('/api/ai/models');
            const data = await response.json();
            
            if (data.success) {
                // normalize models into array if backend returned object map
                const modelsList = Array.isArray(data.models) ? data.models : Object.values(data.models || {});
                // ensure `available` flag exists and provider is set
                const normalized = modelsList.map((m: any) => ({ 
                    ...(m || {}), 
                    available: (m && m.available) !== false,
                    provider: m?.provider || 'openai', // Default provider if missing
                    name: m?.name || m?.id || 'Unknown Model' // Ensure name exists
                }));
                setModels(normalized);
                
                // Default to 'auto' if not explicitly set, otherwise use saved preference or default_model
                const savedModel = localStorage.getItem('selected_ai_model') || 'auto';
                const modelToUse = savedModel === 'auto' ? 'auto' : (data.default_model || savedModel);
                setSelectedModel(modelToUse);
                
                // Notify parent of model selection
                if (onModelChange) {
                    onModelChange(modelToUse);
                }
                
                // Test all available models
                for (const model of normalized) {
                    if (model.available) {
                        testModelConnection(model.id);
                    }
                }
            } else {
                console.error('Failed to load models:', data.error || 'Unknown error');
                // Set default model even if loading failed
                setSelectedModel('auto');
                if (onModelChange) {
                    onModelChange('auto');
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
            const response = await fetch(`/api/ai/model-status?model_id=${modelId}`);
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
            // Persist per-user preference
            await fetch('/api/users/preferences/ai-model', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ai_model: modelId })
            });
            setSelectedModel(modelId);
            localStorage.setItem('selected_ai_model', modelId);
            onModelChange?.(modelId);
            const displayName = modelId === 'auto' ? 'Auto' : modelId;
            message.success(`Switched to ${displayName}`);
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

    const shortDescMap: Record<string, string> = {
        azure_gpt5_mini: 'Aicser: best for deep reasoning, synthesis and structured outputs',
        azure_gpt41_mini: 'Fast & reliable: great for concise summaries and accurate instructions',
        azure_gpt5: 'Full GPT-5: highest-capacity reasoning and creativity (higher cost)',
        openai_gpt4_mini: 'OpenAI fast model: good general-purpose quality and latency balance',
        openai_gpt35: 'Cost-effective: lighter-weight conversational model for simple tasks'
    };

    const renderModelOption = (model: Model) => {
        // Remove provider indicators from model.name if present e.g., "GPT-5 Mini (Azure)" -> "GPT-5 Mini"
        const displayName = (model.name || model.id || 'Unknown').replace(/\s*\((Azure|OpenAI|Anthropic|Open AI|Azure AI)\)\s*$/i, '').trim();
        const shortName = displayName.split(' ').slice(0, 2).join(' '); // Get first 2 words for short name
        // Ensure provider tag is meaningful - use provider name or default to 'AI'
        const provider = model.provider || 'openai';
        const providerTag = provider.toUpperCase().substring(0, 3); // Short provider tag (e.g., "AZU", "OPE", "OPE")
        const shortDesc = (model as any).description || shortDescMap[model.id] || `${provider} model`;
        return (
            <Option key={model.id} value={model.id} disabled={!model.available}>
                <Tooltip title={shortDesc} placement="right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size="small" align="center">
                            <Tag color={getProviderColor(model.provider)} style={{ fontSize: 11, margin: 0, padding: '2px 6px' }}>
                                {providerTag}
                            </Tag>
                            <Text strong={selectedModel === model.id} style={{ marginLeft: 0, fontSize: 13 }}>
                                {shortName}
                            </Text>
                        </Space>
                        <Space size="small" align="center">
                            {getStatusIcon(model.id)}
                            {!model.available && (
                                <Tag color="red" style={{ fontSize: 10 }}>Unavailable</Tag>
                            )}
                        </Space>
                    </div>
                </Tooltip>
            </Option>
        );
    };

    // Add "Auto" option at the beginning
    const autoOption = {
        id: 'auto',
        name: 'Auto',
        provider: 'auto',
        cost_per_1k_tokens: 0,
        available: true
    };

    const allModels = [autoOption, ...models];

    if (compact) {
        return (
            <Select
                value={selectedModel}
                onChange={handleModelChange}
                loading={loading}
                className="model-selector-compact"
                style={{ minWidth: 180 }}
                placeholder="Select AI Model"
                dropdownRender={menu => (
                    <div>
                        {menu}
                        <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                            <Button 
                                type="link" 
                                size="small" 
                                icon={<SettingOutlined />}
                                onClick={() => window.location.href = '/settings'}
                                style={{ width: '100%' }}
                            >
                                AI Model Settings →
                            </Button>
                        </div>
                    </div>
                )}
            >
                {allModels.slice(0, 6).map(model => (
                    model.id === 'auto' ? (
                        <Option key="auto" value="auto">
                            <Tooltip title="Automatically selects the best model for optimal performance">
                                <Space size="small">
                                    <Tag color="blue" style={{ fontSize: 11, margin: 0, padding: '2px 6px' }}>AUTO</Tag>
                                    <Text style={{ fontSize: 13 }}>Auto</Text>
                                </Space>
                            </Tooltip>
                        </Option>
                    ) : renderModelOption(model)
                ))}
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
                            <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                                <Button 
                                    type="link" 
                                    size="small" 
                                    icon={<SettingOutlined />}
                                    onClick={() => window.location.href = '/settings'}
                                    style={{ width: '100%' }}
                                >
                                    AI Model Settings →
                                </Button>
                            </div>
                        </div>
                    )}
                >
                    {allModels.slice(0, 6).map(model => (
                        model.id === 'auto' ? (
                            <Option key="auto" value="auto">
                                <Tooltip title="Automatically selects the best model for optimal performance">
                                    <Space size="small">
                                        <Tag color="blue" style={{ fontSize: 11, margin: 0, padding: '2px 6px' }}>AUTO</Tag>
                                        <Text style={{ fontSize: 13 }}>Auto</Text>
                                    </Space>
                                </Tooltip>
                            </Option>
                        ) : renderModelOption(model)
                    ))}
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