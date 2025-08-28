'use client';

import React, { useState, useEffect } from 'react';
import { 
    Form, 
    Input, 
    Select, 
    Button, 
    Card, 
    message, 
    Spin, 
    Typography, 
    Space,
    Divider,
    Alert
} from 'antd';
import { DatabaseOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { IDatabaseConnection, IDataSource } from '../FileUpload/types';

const { Title, Text } = Typography;
const { Option } = Select;

export interface DatabaseConnectorProps {
    onConnect: (dataSource: IDataSource) => void;
    onCancel?: () => void;
}

interface SupportedDatabase {
    type: string;
    name: string;
    driver: string;
    default_port: number;
    ssl_support: boolean;
}

const DatabaseConnector: React.FC<DatabaseConnectorProps> = ({
    onConnect,
    onCancel
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [supportedDatabases, setSupportedDatabases] = useState<SupportedDatabase[]>([]);
    const [selectedDbType, setSelectedDbType] = useState<string>('');
    const [connectionTested, setConnectionTested] = useState(false);

    // Load supported databases on component mount
    useEffect(() => {
        loadSupportedDatabases();
    }, []);

    const loadSupportedDatabases = async () => {
        try {
            const response = await fetch('http://localhost:8000/data/supported-databases');
            const data = await response.json();
            
            if (data.success) {
                setSupportedDatabases(data.supported_databases);
            } else {
                message.error('Failed to load supported databases');
            }
        } catch (error) {
            console.error('Error loading supported databases:', error);
            message.error('Failed to load supported databases');
        }
    };

    const handleDatabaseTypeChange = (dbType: string) => {
        setSelectedDbType(dbType);
        setConnectionTested(false);
        
        // Set default port based on database type
        const selectedDb = supportedDatabases.find(db => db.type === dbType);
        if (selectedDb && selectedDb.default_port) {
            form.setFieldsValue({ port: selectedDb.default_port });
        }
    };

    const testConnection = async () => {
        try {
            const values = await form.validateFields();
            setTestingConnection(true);

            const connectionConfig: IDatabaseConnection = {
                type: values.type,
                host: values.host,
                port: values.port,
                database: values.database,
                username: values.username,
                password: values.password,
                name: values.name,
                ssl: values.ssl || false,
                schema: values.schema
            };

            // Add database-specific fields
            if (values.type === 'bigquery') {
                connectionConfig.projectId = values.projectId;
            } else if (values.type === 'snowflake') {
                connectionConfig.account = values.account;
                connectionConfig.region = values.region;
            }

            const response = await fetch('http://localhost:8000/data/database/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(connectionConfig)
            });

            const data = await response.json();

            if (data.success) {
                message.success('Connection test successful!');
                setConnectionTested(true);
            } else {
                message.error(`Connection test failed: ${data.error}`);
                setConnectionTested(false);
            }
        } catch (error) {
            console.error('Connection test error:', error);
            message.error('Connection test failed');
            setConnectionTested(false);
        } finally {
            setTestingConnection(false);
        }
    };

    const handleConnect = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const connectionConfig: IDatabaseConnection = {
                type: values.type,
                host: values.host,
                port: values.port,
                database: values.database,
                username: values.username,
                password: values.password,
                name: values.name || `${values.type}_${values.database}`,
                ssl: values.ssl || false,
                schema: values.schema
            };

            // Add database-specific fields
            if (values.type === 'bigquery') {
                connectionConfig.projectId = values.projectId;
            } else if (values.type === 'snowflake') {
                connectionConfig.account = values.account;
                connectionConfig.region = values.region;
            }

            const response = await fetch('http://localhost:8000/data/database/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(connectionConfig)
            });

            const data = await response.json();

            if (data.success) {
                // Create data source object from the response
                const dataSource: IDataSource = {
                    id: data.data_source_id || data.connection_info?.id,
                    name: data.connection_info?.name || connectionConfig.name,
                    type: 'database',
                    dbType: data.connection_info?.type || connectionConfig.type,
                    createdAt: data.connection_info?.created_at || new Date().toISOString(),
                    status: data.connection_info?.status || 'connected'
                };

                message.success('Database connected successfully!');
                onConnect(dataSource);
                form.resetFields();
            } else {
                message.error(`Connection failed: ${data.error || data.message}`);
            }
        } catch (error) {
            console.error('Database connection error:', error);
            message.error('Database connection failed');
        } finally {
            setLoading(false);
        }
    };

    const renderDatabaseSpecificFields = () => {
        switch (selectedDbType) {
            case 'bigquery':
                return (
                    <Form.Item
                        name="projectId"
                        label="Project ID"
                        rules={[{ required: true, message: 'Please enter BigQuery project ID' }]}
                    >
                        <Input placeholder="your-project-id" />
                    </Form.Item>
                );
            
            case 'snowflake':
                return (
                    <>
                        <Form.Item
                            name="account"
                            label="Account"
                            rules={[{ required: true, message: 'Please enter Snowflake account' }]}
                        >
                            <Input placeholder="your-account.snowflakecomputing.com" />
                        </Form.Item>
                        <Form.Item
                            name="region"
                            label="Region"
                            initialValue="us-west-2"
                        >
                            <Input placeholder="us-west-2" />
                        </Form.Item>
                    </>
                );
            
            default:
                return null;
        }
    };

    return (
        <Card 
            title={
                <Space>
                    <DatabaseOutlined />
                    <Title level={4} style={{ margin: 0 }}>Connect Database</Title>
                </Space>
            }
            style={{ maxWidth: 600, margin: '0 auto' }}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleConnect}
                initialValues={{
                    port: 5432,
                    ssl: false
                }}
            >
                <Form.Item
                    name="type"
                    label="Database Type"
                    rules={[{ required: true, message: 'Please select database type' }]}
                >
                    <Select 
                        placeholder="Select database type"
                        onChange={handleDatabaseTypeChange}
                        loading={supportedDatabases.length === 0}
                    >
                        {supportedDatabases.map(db => (
                            <Option key={db.type} value={db.type}>
                                <Space>
                                    <DatabaseOutlined />
                                    {db.name}
                                    <Text type="secondary">({db.driver})</Text>
                                </Space>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Connection Name"
                    rules={[{ required: true, message: 'Please enter connection name' }]}
                >
                    <Input placeholder="My Database Connection" />
                </Form.Item>

                <Divider>Connection Details</Divider>

                <Form.Item
                    name="host"
                    label="Host"
                    rules={[{ required: true, message: 'Please enter host' }]}
                >
                    <Input placeholder="localhost" />
                </Form.Item>

                <Form.Item
                    name="port"
                    label="Port"
                    rules={[{ required: true, message: 'Please enter port' }]}
                >
                    <Input type="number" placeholder="5432" />
                </Form.Item>

                <Form.Item
                    name="database"
                    label="Database Name"
                    rules={[{ required: true, message: 'Please enter database name' }]}
                >
                    <Input placeholder="my_database" />
                </Form.Item>

                <Form.Item
                    name="username"
                    label="Username"
                    rules={[{ required: true, message: 'Please enter username' }]}
                >
                    <Input placeholder="username" />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true, message: 'Please enter password' }]}
                >
                    <Input.Password placeholder="password" />
                </Form.Item>

                {selectedDbType === 'postgresql' && (
                    <Form.Item
                        name="schema"
                        label="Schema"
                        initialValue="public"
                    >
                        <Input placeholder="public" />
                    </Form.Item>
                )}

                {renderDatabaseSpecificFields()}

                {connectionTested && (
                    <Alert
                        message="Connection Test Successful"
                        description="The database connection has been verified and is ready to use."
                        type="success"
                        icon={<CheckCircleOutlined />}
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Button
                        type="default"
                        onClick={testConnection}
                        loading={testingConnection}
                        disabled={!selectedDbType}
                        icon={<ExclamationCircleOutlined />}
                    >
                        Test Connection
                    </Button>

                    <Space>
                        {onCancel && (
                            <Button onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            disabled={!connectionTested}
                            icon={<DatabaseOutlined />}
                        >
                            Connect Database
                        </Button>
                    </Space>
                </Space>
            </Form>

            <Divider />
            
            <Alert
                message="Powered by Cube.js"
                description="This database connector uses Cube.js pre-built drivers for optimal performance and reliability."
                type="info"
                showIcon
            />
        </Card>
    );
};

export default DatabaseConnector;