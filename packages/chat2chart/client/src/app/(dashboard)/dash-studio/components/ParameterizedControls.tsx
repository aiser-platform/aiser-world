'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    Select,
    DatePicker,
    Slider,
    Input,
    Switch,
    InputNumber,
    Radio,
    Checkbox,
    Tag,
    Row,
    Col,
    message,
    Tooltip,
    Divider
} from 'antd';
import {
    ControlOutlined,
    PlusOutlined,
    DeleteOutlined,
    SettingOutlined,
    LinkOutlined,
    DisconnectOutlined,
    SaveOutlined,
    ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface ControlParameter {
    id: string;
    name: string;
    type: 'slider' | 'date' | 'dropdown' | 'input' | 'switch' | 'radio' | 'checkbox' | 'number' | 'range';
    value: any;
    defaultValue: any;
    options?: { label: string; value: any }[];
    config: {
        min?: number;
        max?: number;
        step?: number;
        placeholder?: string;
        required?: boolean;
        multiple?: boolean;
        format?: string;
        showTime?: boolean;
        disabled?: boolean;
        size?: 'small' | 'middle' | 'large';
    };
    widgetIds: string[];
    description?: string;
}

interface ParameterizedControlsProps {
    onParameterChange: (parameter: ControlParameter) => void;
    onParameterAdd: (parameter: ControlParameter) => void;
    onParameterDelete: (parameterId: string) => void;
    parameters?: ControlParameter[];
}

const ParameterizedControls: React.FC<ParameterizedControlsProps> = ({
    onParameterChange,
    onParameterAdd,
    onParameterDelete,
    parameters = []
}) => {
    const [showAddControl, setShowAddControl] = useState(false);
    const [newParameter, setNewParameter] = useState<Partial<ControlParameter>>({
        type: 'input',
        config: {},
        widgetIds: []
    });

    // Add new parameter
    const handleAddParameter = () => {
        if (!newParameter.name?.trim() || !newParameter.type) {
            message.error('Please fill in all required fields');
            return;
        }

        const parameter: ControlParameter = {
            id: `param_${Date.now()}`,
            name: newParameter.name.trim(),
            type: newParameter.type as any,
            value: newParameter.defaultValue || getDefaultValue(newParameter.type as any),
            defaultValue: newParameter.defaultValue || getDefaultValue(newParameter.type as any),
            options: newParameter.options || [],
            config: newParameter.config || {},
            widgetIds: [],
            description: newParameter.description
        };

        onParameterAdd(parameter);
        setNewParameter({ type: 'input', config: {}, widgetIds: [] });
        setShowAddControl(false);
        message.success(`Parameter '${parameter.name}' added successfully!`);
    };

    // Get default value based on type
    const getDefaultValue = (type: string) => {
        switch (type) {
            case 'slider':
            case 'number':
                return 0;
            case 'date':
                return null;
            case 'dropdown':
            case 'input':
                return '';
            case 'switch':
                return false;
            case 'radio':
                return '';
            case 'checkbox':
                return [];
            case 'range':
                return [0, 100];
            default:
                return '';
        }
    };

    // Get control component based on type
    const getControlComponent = (parameter: ControlParameter) => {
        const { type, value, config, options } = parameter;

        switch (type) {
            case 'slider':
                return (
                    <Slider
                        min={config.min || 0}
                        max={config.max || 100}
                        step={config.step || 1}
                        value={value}
                        onChange={(val) => onParameterChange({ ...parameter, value: val })}
                        style={{ width: '100%' }}
                    />
                );

            case 'date':
                return (
                    <DatePicker
                        value={value}
                        onChange={(date) => onParameterChange({ ...parameter, value: date })}
                        showTime={config.showTime}
                        format={config.format}
                        placeholder={config.placeholder}
                        disabled={config.disabled}
                        size={config.size}
                        style={{ width: '100%' }}
                    />
                );

            case 'dropdown':
                return (
                    <Select
                        value={value}
                        onChange={(val) => onParameterChange({ ...parameter, value: val })}
                        placeholder={config.placeholder}
                        disabled={config.disabled}
                        size={config.size}
                        mode={config.multiple ? 'multiple' : undefined}
                        style={{ width: '100%' }}
                    >
                        {options?.map(option => (
                            <Option key={option.value} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                );

            case 'input':
                return (
                    <Input
                        value={value}
                        onChange={(e) => onParameterChange({ ...parameter, value: e.target.value })}
                        placeholder={config.placeholder}
                        disabled={config.disabled}
                        size={config.size}
                    />
                );

            case 'switch':
                return (
                    <Switch
                        checked={value}
                        onChange={(checked) => onParameterChange({ ...parameter, value: checked })}
                        disabled={config.disabled}
                    />
                );

            case 'radio':
                return (
                    <Radio.Group
                        value={value}
                        onChange={(e) => onParameterChange({ ...parameter, value: e.target.value })}
                        disabled={config.disabled}
                        size={config.size}
                    >
                        {options?.map(option => (
                            <Radio key={option.value} value={option.value}>
                                {option.label}
                            </Radio>
                        ))}
                    </Radio.Group>
                );

            case 'checkbox':
                return (
                    <Checkbox.Group
                        value={value}
                        onChange={(values) => onParameterChange({ ...parameter, value: values })}
                        disabled={config.disabled}
                    >
                        {options?.map(option => (
                            <Checkbox key={option.value} value={option.value}>
                                {option.label}
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                );

            case 'number':
                return (
                    <InputNumber
                        value={value}
                        onChange={(val) => onParameterChange({ ...parameter, value: val })}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        placeholder={config.placeholder}
                        disabled={config.disabled}
                        size={config.size}
                        style={{ width: '100%' }}
                    />
                );

            case 'range':
                return (
                    <RangePicker
                        value={value}
                        onChange={(dates) => onParameterChange({ ...parameter, value: dates })}
                        showTime={config.showTime}
                        format={config.format}
                        placeholder={[config.placeholder || 'Start', config.placeholder || 'End']}
                        disabled={config.disabled}
                        size={config.size}
                        style={{ width: '100%' }}
                    />
                );

            default:
                return <Input value={value} disabled />;
        }
    };

    // Get type-specific configuration options
    const getTypeConfigOptions = (type: string) => {
        switch (type) {
            case 'slider':
            case 'number':
                return (
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <div>
                                <Text>Min:</Text>
                                <InputNumber
                                    value={newParameter.config?.min}
                                    onChange={(val) => setNewParameter(prev => ({
                                        ...prev,
                                        config: { ...prev.config, min: val || undefined }
                                    }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </Col>
                        <Col span={8}>
                            <div>
                                <Text>Max:</Text>
                                <InputNumber
                                    value={newParameter.config?.max}
                                    onChange={(val) => setNewParameter(prev => ({
                                        ...prev,
                                        config: { ...prev.config, max: val || undefined }
                                    }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </Col>
                        <Col span={8}>
                            <div>
                                <Text>Step:</Text>
                                <InputNumber
                                    value={newParameter.config?.step}
                                    onChange={(val) => setNewParameter(prev => ({
                                        ...prev,
                                        config: { ...prev.config, step: val || undefined }
                                    }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </Col>
                    </Row>
                );

            case 'dropdown':
            case 'radio':
            case 'checkbox':
                return (
                    <div>
                        <Text>Options:</Text>
                        <div style={{ marginTop: 8 }}>
                            {newParameter.options?.map((option, index) => (
                                <Row gutter={[8, 8]} key={index} style={{ marginBottom: 8 }}>
                                    <Col span={10}>
                                        <Input
                                            placeholder="Label"
                                            value={option.label}
                                            onChange={(e) => {
                                                const newOptions = [...(newParameter.options || [])];
                                                newOptions[index] = { ...option, label: e.target.value };
                                                setNewParameter(prev => ({ ...prev, options: newOptions }));
                                            }}
                                        />
                                    </Col>
                                    <Col span={10}>
                                        <Input
                                            placeholder="Value"
                                            value={option.value}
                                            onChange={(e) => {
                                                const newOptions = [...(newParameter.options || [])];
                                                newOptions[index] = { ...option, value: e.target.value };
                                                setNewParameter(prev => ({ ...prev, options: newOptions }));
                                            }}
                                        />
                                    </Col>
                                    <Col span={4}>
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => {
                                                const newOptions = newParameter.options?.filter((_, i) => i !== index);
                                                setNewParameter(prev => ({ ...prev, options: newOptions }));
                                            }}
                                        />
                                    </Col>
                                </Row>
                            ))}
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    const newOptions = [...(newParameter.options || []), { label: '', value: '' }];
                                    setNewParameter(prev => ({ ...prev, options: newOptions }));
                                }}
                            >
                                Add Option
                            </Button>
                        </div>
                    </div>
                );

            case 'date':
            case 'range':
                return (
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <div>
                                <Text>Format:</Text>
                                <Input
                                    value={newParameter.config?.format}
                                    onChange={(e) => setNewParameter(prev => ({
                                        ...prev,
                                        config: { ...prev.config, format: e.target.value }
                                    }))}
                                    placeholder="YYYY-MM-DD"
                                />
                            </div>
                        </Col>
                        <Col span={12}>
                            <div>
                                <Text>Show Time:</Text>
                                <Switch
                                    checked={newParameter.config?.showTime}
                                    onChange={(checked) => setNewParameter(prev => ({
                                        ...prev,
                                        config: { ...prev.config, showTime: checked }
                                    }))}
                                />
                            </div>
                        </Col>
                    </Row>
                );

            default:
                return null;
        }
    };

    return (
        <div className="parameterized-controls">
            <Card
                title={
                    <Space>
                        <ControlOutlined />
                        <span>Parameterized Controls</span>
                        <Tag color="blue">{parameters.length} active</Tag>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                parameters.forEach(param => {
                                    onParameterChange({ ...param, value: param.defaultValue });
                                });
                                message.success('All parameters reset to default values');
                            }}
                        >
                            Reset All
                        </Button>
                        <Button
                            size="small"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setShowAddControl(true)}
                        >
                            Add Control
                        </Button>
                    </Space>
                }
            >
                {/* Active Parameters */}
                <Row gutter={[16, 16]}>
                    {parameters.map(parameter => (
                        <Col xs={24} sm={12} md={8} lg={6} key={parameter.id}>
                            <Card
                                size="small"
                                title={
                                    <Space>
                                        <Text strong>{parameter.name}</Text>
                                        <Tag color="green">{parameter.type}</Tag>
                                    </Space>
                                }
                                extra={
                                    <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => onParameterDelete(parameter.id)}
                                    />
                                }
                            >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    {getControlComponent(parameter)}
                                    {parameter.description && (
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {parameter.description}
                                        </Text>
                                    )}
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        Connected to {parameter.widgetIds.length} widgets
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {parameters.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <ControlOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Title level={4} style={{ color: '#666' }}>
                            No Parameterized Controls
                        </Title>
                        <Text type="secondary">
                            Add controls to enable interactive dashboard parameters
                        </Text>
                    </div>
                )}

                {/* Add Control Modal */}
                {showAddControl && (
                    <Card
                        size="small"
                        title="Add New Control Parameter"
                        style={{ marginTop: 16 }}
                        extra={
                            <Button
                                size="small"
                                onClick={() => setShowAddControl(false)}
                            >
                                Cancel
                            </Button>
                        }
                    >
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div>
                                    <Text>Parameter Name:</Text>
                                    <Input
                                        value={newParameter.name}
                                        onChange={(e) => setNewParameter(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., date_range, category, status"
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div>
                                    <Text>Parameter Type:</Text>
                                    <Select
                                        value={newParameter.type}
                                        onChange={(type) => setNewParameter(prev => ({ ...prev, type }))}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value="slider">Slider</Option>
                                        <Option value="date">Date Picker</Option>
                                        <Option value="dropdown">Dropdown</Option>
                                        <Option value="input">Text Input</Option>
                                        <Option value="switch">Toggle Switch</Option>
                                        <Option value="radio">Radio Buttons</Option>
                                        <Option value="checkbox">Checkboxes</Option>
                                        <Option value="number">Number Input</Option>
                                        <Option value="range">Date Range</Option>
                                    </Select>
                                </div>
                            </Col>
                        </Row>

                        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                            <Col span={12}>
                                <div>
                                    <Text>Default Value:</Text>
                                    <Input
                                        value={newParameter.defaultValue}
                                        onChange={(e) => setNewParameter(prev => ({ ...prev, defaultValue: e.target.value }))}
                                        placeholder="Default value"
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div>
                                    <Text>Size:</Text>
                                    <Select
                                        value={newParameter.config?.size}
                                        onChange={(size) => setNewParameter(prev => ({
                                            ...prev,
                                            config: { ...prev.config, size }
                                        }))}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value="small">Small</Option>
                                        <Option value="middle">Medium</Option>
                                        <Option value="large">Large</Option>
                                    </Select>
                                </div>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 16 }}>
                            <Text>Description:</Text>
                            <TextArea
                                value={newParameter.description}
                                onChange={(e) => setNewParameter(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Optional description"
                                rows={2}
                            />
                        </div>

                        {/* Type-specific configuration */}
                        {newParameter.type && (
                            <div style={{ marginTop: 16 }}>
                                <Divider>Configuration</Divider>
                                {getTypeConfigOptions(newParameter.type)}
                            </div>
                        )}

                        <div style={{ marginTop: 16 }}>
                            <Button
                                type="primary"
                                onClick={handleAddParameter}
                                disabled={!newParameter.name?.trim() || !newParameter.type}
                            >
                                Add Parameter
                            </Button>
                        </div>
                    </Card>
                )}
            </Card>
        </div>
    );
};

export default ParameterizedControls;
