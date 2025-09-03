'use client';

import React, { useState, useEffect } from 'react';
import {
    Form,
    Input,
    Select,
    Button,
    message,
    Card,
    Row,
    Col,
    Typography,
    Alert,
    Space,
    Tag,
    Switch,
    InputNumber,
    Collapse,
    Tooltip,
} from 'antd';
import {
    CloudOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
    DatabaseOutlined,
} from '@ant-design/icons';
import { enhancedDataService, EnterpriseConnectionConfig } from '@/services/enhancedDataService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface EnterpriseConnectorTabProps {
    onConnectionCreated: (dataSource: any) => void;
}

const EnterpriseConnectorTab: React.FC<EnterpriseConnectorTabProps> = ({
    onConnectionCreated,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
    const [supportedConnectors, setSupportedConnectors] = useState<any[]>([]);

    useEffect(() => {
        loadSupportedConnectors();
    }, []);

    const loadSupportedConnectors = async () => {
        try {
            const connectors = enhancedDataService.getSupportedEnterpriseConnectors();
            setSupportedConnectors(connectors);
        } catch (error) {
            console.error('Failed to load supported connectors:', error);
        }
    };

    const handleTestConnection = async () => {
        const values = form.getFieldsValue();
        if (!values.type || !values.name) {
            message.error('Please fill in the required fields');
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const config: EnterpriseConnectionConfig = {
                type: values.type,
                name: values.name,
                host: values.host,
                port: values.port,
                database: values.database,
                username: values.username,
                password: values.password,
                token: values.token,
                api_key: values.api_key,
                connection_string: values.connection_string,
                ssl_enabled: values.ssl_enabled ?? true,
                timeout: values.timeout ?? 30,
                metadata: values.metadata,
            };

            const result = await enhancedDataService.testEnterpriseConnection(config);
            setTestResult(result);

            if (result.success) {
                message.success('Connection test successful!');
            } else {
                message.error(`Connection test failed: ${result.error}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
            setTestResult({ success: false, error: errorMessage });
            message.error(errorMessage);
        } finally {
            setTesting(false);
        }
    };

    const handleCreateConnection = async () => {
        const values = form.getFieldsValue();
        
        if (!values.type || !values.name) {
            message.error('Please fill in the required fields');
            return;
        }

        setLoading(true);

        try {
            const config: EnterpriseConnectionConfig = {
                type: values.type,
                name: values.name,
                host: values.host,
                port: values.port,
                database: values.database,
                username: values.username,
                password: values.password,
                token: values.token,
                api_key: values.api_key,
                connection_string: values.connection_string,
                ssl_enabled: values.ssl_enabled ?? true,
                timeout: values.timeout ?? 30,
                metadata: values.metadata,
            };

            const result = await enhancedDataService.createEnterpriseConnection(config);

            if (result.success) {
                message.success('Enterprise connection created successfully!');
                onConnectionCreated({
                    id: result.connection_id,
                    name: values.name,
                    type: 'enterprise_connector',
                    status: 'connected',
                    created_at: new Date().toISOString(),
                });
                form.resetFields();
                setTestResult(null);
            } else {
                message.error(`Failed to create connection: ${result.error}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create connection';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const selectedConnector = supportedConnectors.find(c => c.type === form.getFieldValue('type'));

    return (
        <div>
            <Alert
                message="Enterprise Data Connectors"
                description="Connect to enterprise data sources with production-ready drivers and real-time connectivity."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {supportedConnectors.map((connector) => (
                    <Col xs={24} sm={12} md={8} key={connector.type}>
                        <Card
                            hoverable
                            size="small"
                            style={{
                                border: form.getFieldValue('type') === connector.type ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                cursor: 'pointer',
                            }}
                            onClick={() => form.setFieldsValue({ type: connector.type })}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', marginBottom: 8 }}>{connector.icon}</div>
                                <Title level={5} style={{ margin: 0 }}>{connector.name}</Title>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {connector.description}
                                </Text>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    ssl_enabled: true,
                    timeout: 30,
                }}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="type"
                            label="Connector Type"
                            rules={[{ required: true, message: 'Please select a connector type' }]}
                        >
                            <Select placeholder="Select connector type" size="large">
                                {supportedConnectors.map((connector) => (
                                    <Option key={connector.type} value={connector.type}>
                                        <Space>
                                            <span>{connector.icon}</span>
                                            <span>{connector.name}</span>
                                        </Space>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="Connection Name"
                            rules={[{ required: true, message: 'Please enter a connection name' }]}
                        >
                            <Input placeholder="e.g., Production Database" size="large" />
                        </Form.Item>
                    </Col>
                </Row>

                {selectedConnector && (
                    <Alert
                        message={`${selectedConnector.name} Configuration`}
                        description={selectedConnector.description}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Collapse>
                    <Panel header="Basic Configuration" key="basic">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="host" label="Host">
                                    <Input placeholder="hostname or IP address" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="port" label="Port">
                                    <InputNumber placeholder="port number" style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="database" label="Database">
                                    <Input placeholder="database name" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="username" label="Username">
                                    <Input placeholder="username" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="password" label="Password">
                            <Input.Password placeholder="password" />
                        </Form.Item>
                    </Panel>

                    <Panel header="Advanced Configuration" key="advanced">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="token" label="Token">
                                    <Input placeholder="API token or access token" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="api_key" label="API Key">
                                    <Input placeholder="API key" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="connection_string" label="Connection String">
                            <Input.TextArea 
                                placeholder="Full connection string (overrides individual fields)"
                                rows={3}
                            />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="ssl_enabled" label="SSL Enabled" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="timeout" label="Timeout (seconds)">
                                    <InputNumber min={5} max={300} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Panel>
                </Collapse>

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                        <Button
                            type="default"
                            icon={<ThunderboltOutlined />}
                            loading={testing}
                            onClick={handleTestConnection}
                        >
                            Test Connection
                        </Button>
                        {testResult && (
                            <Tag
                                color={testResult.success ? 'success' : 'error'}
                                icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                            >
                                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                            </Tag>
                        )}
                    </Space>

                    <Button
                        type="primary"
                        loading={loading}
                        onClick={handleCreateConnection}
                        disabled={!testResult?.success}
                    >
                        Create Connection
                    </Button>
                </div>

                {testResult && !testResult.success && (
                    <Alert
                        message="Connection Test Failed"
                        description={testResult.error}
                        type="error"
                        showIcon
                        style={{ marginTop: 16 }}
                    />
                )}
            </Form>
        </div>
    );
};

export default EnterpriseConnectorTab;
