import React, { useState } from 'react';
import { Modal, Select, Card, Typography, Space, Tag, Button, Divider, Tooltip } from 'antd';
import { 
    SettingOutlined, 
    ThunderboltOutlined,
    ExperimentOutlined,
    RocketOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import AiserAIIcon from '@/app/components/AiserAIIcon/AiserAIIcon';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface EnhancedModeSelectorProps {
    visible: boolean;
    onClose: () => void;
    currentMode: string;
    onModeChange: (mode: string) => void;
    currentModel?: string;
    onModelChange?: (model: string) => void;
}

const EnhancedModeSelector: React.FC<EnhancedModeSelectorProps> = ({
    visible,
    onClose,
    currentMode,
    onModeChange,
    currentModel = 'gpt-4o-mini',
    onModelChange
}) => {
    const [selectedMode, setSelectedMode] = useState(currentMode);
    const [selectedModel, setSelectedModel] = useState(currentModel);

    const modes = [
        {
            key: 'standard',
            title: 'Standard Mode',
            description: 'Fast, efficient analysis with basic insights',
            icon: <ThunderboltOutlined />,
            color: '#1890ff',
            features: ['Quick responses', 'Basic charts', 'Simple insights'],
            recommended: true
        },
        {
            key: 'deep',
            title: 'Deep Analysis Mode',
            description: 'Comprehensive analysis with advanced reasoning',
            icon: <ExperimentOutlined />,
            color: '#722ed1',
            features: ['Multi-agent collaboration', 'Advanced reasoning', 'Detailed insights', 'Confidence scoring'],
            recommended: false
        },
        {
            key: 'research',
            title: 'Research Mode',
            description: 'Academic-level analysis with citations',
            icon: <RocketOutlined />,
            color: '#52c41a',
            features: ['Academic rigor', 'Citations', 'Methodology details', 'Peer review quality'],
            recommended: false
        }
    ];

    const models = [
        {
            key: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'OpenAI',
            description: 'Fast and cost-effective for most tasks',
            capabilities: ['Text analysis', 'Basic reasoning', 'Code generation'],
            cost: 'Low',
            speed: 'Fast'
        },
        {
            key: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'OpenAI',
            description: 'Most capable model for complex analysis',
            capabilities: ['Advanced reasoning', 'Complex analysis', 'Creative insights'],
            cost: 'High',
            speed: 'Medium'
        },
        {
            key: 'claude-3-5-sonnet',
            name: 'Claude 3.5 Sonnet',
            provider: 'Anthropic',
            description: 'Excellent for analytical tasks',
            capabilities: ['Deep analysis', 'Code understanding', 'Mathematical reasoning'],
            cost: 'Medium',
            speed: 'Medium'
        },
        {
            key: 'gemini-pro',
            name: 'Gemini Pro',
            provider: 'Google',
            description: 'Good balance of capability and speed',
            capabilities: ['Multimodal analysis', 'Code generation', 'Reasoning'],
            cost: 'Low',
            speed: 'Fast'
        }
    ];

    const handleSave = () => {
        onModeChange(selectedMode);
        onModelChange?.(selectedModel);
        onClose();
    };

    const selectedModeData = modes.find(m => m.key === selectedMode);
    const selectedModelData = models.find(m => m.key === selectedModel);

    return (
        <Modal
            title={
                <Space>
                    <SettingOutlined />
                    <span>AI Configuration</span>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="save" type="primary" onClick={handleSave}>
                    Apply Configuration
                </Button>
            ]}
        >
            <div style={{ padding: '16px 0' }}>
                {/* Mode Selection */}
                <Card title="Analysis Mode" style={{ marginBottom: 24 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {modes.map(mode => (
                            <Card
                                key={mode.key}
                                size="small"
                                style={{
                                    border: selectedMode === mode.key ? `2px solid ${mode.color}` : '1px solid #d9d9d9',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onClick={() => setSelectedMode(mode.key)}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ color: mode.color, fontSize: 20, marginTop: 2 }}>
                                        {mode.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Title level={5} style={{ margin: 0 }}>
                                                {mode.title}
                                            </Title>
                                            {mode.recommended && (
                                                <Tag color="green">Recommended</Tag>
                                            )}
                                        </div>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                            {mode.description}
                                        </Text>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {mode.features.map(feature => (
                                                <Tag key={feature}>
                                                    {feature}
                                                </Tag>
                                            ))}
                                        </div>
                                    </div>
                                    {selectedMode === mode.key && (
                                        <CheckCircleOutlined style={{ color: mode.color, fontSize: 20 }} />
                                    )}
                                </div>
                            </Card>
                        ))}
                    </Space>
                </Card>

                {/* Model Selection */}
                <Card title="AI Model">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">
                                Choose the AI model that best fits your analysis needs
                            </Text>
                        </div>
                        
                        <Select
                            value={selectedModel}
                            onChange={setSelectedModel}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            {models.map(model => (
                                <Option key={model.key} value={model.key}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <AiserAIIcon size={18} />
                                        <span>{model.name}</span>
                                        <Tag color="blue">{model.provider}</Tag>
                                    </div>
                                </Option>
                            ))}
                        </Select>

                        {selectedModelData && (
                            <Card size="small" style={{ marginTop: 16, background: '#f9f9f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <Title level={5} style={{ margin: '0 0 8px 0' }}>
                                            {selectedModelData.name}
                                        </Title>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                                            {selectedModelData.description}
                                        </Text>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                            <Tag color="green">Cost: {selectedModelData.cost}</Tag>
                                            <Tag color="blue">Speed: {selectedModelData.speed}</Tag>
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Capabilities:</Text>
                                            <div style={{ marginTop: 4 }}>
                                                {selectedModelData.capabilities.map(capability => (
                                                    <Tag key={capability} style={{ marginBottom: 4 }}>
                                                        {capability}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </Space>
                </Card>

                {/* Configuration Summary */}
                <Card title="Configuration Summary" style={{ marginTop: 24 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong>Analysis Mode:</Text>
                                <div style={{ marginTop: 4 }}>
                                    <Space>
                                        <span style={{ color: selectedModeData?.color }}>
                                            {selectedModeData?.icon}
                                        </span>
                                        <span>{selectedModeData?.title}</span>
                                    </Space>
                                </div>
                            </div>
                            <div>
                                <Text strong>AI Model:</Text>
                                <div style={{ marginTop: 4 }}>
                                    <Space>
                                        <AiserAIIcon size={18} />
                                        <span>{selectedModelData?.name}</span>
                                    </Space>
                                </div>
                            </div>
                        </div>
                        
                        <Divider />
                        
                        <div style={{ background: '#f0f8ff', padding: 12, borderRadius: 6 }}>
                            <Space>
                                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    This configuration will be applied to all new conversations. 
                                    You can change it anytime from the settings.
                                </Text>
                            </Space>
                        </div>
                    </Space>
                </Card>
            </div>
        </Modal>
    );
};

export default EnhancedModeSelector;