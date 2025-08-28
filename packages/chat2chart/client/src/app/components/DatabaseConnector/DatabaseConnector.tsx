'use client';

import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Space, message, Spin, Radio, Divider } from 'antd';
import { DatabaseOutlined, ExperimentOutlined, LinkOutlined } from '@ant-design/icons';

const { Option } = Select;

export interface DatabaseConnection {
    type: string;
    name: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    schema?: string;
    uri?: string;
    connectionType?: 'manual' | 'uri';
}

interface DatabaseConnectorProps {
    onConnect: (connection: DatabaseConnection) => void;
    onTest: (connection: DatabaseConnection) => Promise<boolean>;
    loading?: boolean;
}

const DatabaseConnector: React.FC<DatabaseConnectorProps> = ({
    onConnect,
    onTest,
    loading = false
}) => {
    const [form] = Form.useForm();
    const [testing, setTesting] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [connectionType, setConnectionType] = useState<'manual' | 'uri'>('manual');

    const databaseTypes = [
        { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
        { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
        { value: 'sqlserver', label: 'SQL Server', defaultPort: 1433 },
        { value: 'snowflake', label: 'Snowflake', defaultPort: 443 },
        { value: 'bigquery', label: 'BigQuery', defaultPort: null },
        { value: 'redshift', label: 'Redshift', defaultPort: 5439 }
    ];

    const handleDatabaseTypeChange = (type: string) => {
        const dbType = databaseTypes.find(db => db.value === type);
        if (dbType && dbType.defaultPort) {
            form.setFieldsValue({ port: dbType.defaultPort });
        }
    };

    const parseConnectionUri = (uri: string) => {
        try {
            const url = new URL(uri);
            return {
                type: url.protocol.replace(':', ''),
                host: url.hostname,
                port: url.port ? parseInt(url.port) : undefined,
                database: url.pathname.replace('/', ''),
                username: url.username,
                password: url.password
            };
        } catch (error) {
            throw new Error('Invalid connection URI format');
        }
    };

    const handleTestConnection = async () => {
        try {
            const values = await form.validateFields();
            setTesting(true);
            
            let connection: DatabaseConnection;
            
            if (connectionType === 'uri') {
                const parsed = parseConnectionUri(values.uri);
                connection = {
                    ...parsed,
                    name: values.name || `${parsed.type}_${parsed.database}`,
                    uri: values.uri,
                    connectionType: 'uri'
                };
            } else {
                connection = {
                    type: values.type,
                    name: values.name || `${values.type}_${values.database}`,
                    host: values.host,
                    port: values.port,
                    database: values.database,
                    username: values.username,
                    password: values.password,
                    schema: values.schema,
                    connectionType: 'manual'
                };
            }

            const success = await onTest(connection);
            
            if (success) {
                message.success('Connection test successful!');
            } else {
                message.error('Connection test failed. Please check your credentials.');
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Please fill in all required fields.');
        } finally {
            setTesting(false);
        }
    };

    const handleConnect = async () => {
        try {
            const values = await form.validateFields();
            setConnecting(true);
            
            let connection: DatabaseConnection;
            
            if (connectionType === 'uri') {
                const parsed = parseConnectionUri(values.uri);
                connection = {
                    ...parsed,
                    name: values.name || `${parsed.type}_${parsed.database}`,
                    uri: values.uri,
                    connectionType: 'uri'
                };
            } else {
                connection = {
                    type: values.type,
                    name: values.name || `${values.type}_${values.database}`,
                    host: values.host,
                    port: values.port,
                    database: values.database,
                    username: values.username,
                    password: values.password,
                    schema: values.schema,
                    connectionType: 'manual'
                };
            }

            onConnect(connection);
            form.resetFields();
            message.success('Database connection created successfully!');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Please fill in all required fields.');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <Card 
            title={
                <Space>
                    <DatabaseOutlined />
                    Connect Database
                </Space>
            }
            size="small"
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    type: 'postgresql',
                    port: 5432,
                    schema: 'public'
                }}
            >
                <Form.Item label="Connection Method">
                    <Radio.Group 
                        value={connectionType} 
                        onChange={(e) => {
                            setConnectionType(e.target.value);
                            form.resetFields();
                        }}
                    >
                        <Radio value="manual">Manual Configuration</Radio>
                        <Radio value="uri">Connection URI</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Connection Name"
                >
                    <Input placeholder="Optional connection name" />
                </Form.Item>

                {connectionType === 'uri' ? (
                    <>
                        <Form.Item
                            name="uri"
                            label="Connection URI"
                            rules={[{ required: true, message: 'Please enter connection URI' }]}
                        >
                            <Input.TextArea 
                                placeholder="postgres://username:password@host:port/database&#10;mysql://username:password@host:port/database&#10;postgresql://reader:NWDMCE5xdipIjRrp@hh-pgsql-public.ebi.ac.uk:5432/pfmegrnargs"
                                rows={3}
                            />
                        </Form.Item>
                    </>
                ) : (
                    <>
                        <Form.Item
                            name="type"
                            label="Database Type"
                            rules={[{ required: true, message: 'Please select database type' }]}
                        >
                            <Select onChange={handleDatabaseTypeChange}>
                                {databaseTypes.map(db => (
                                    <Option key={db.value} value={db.value}>
                                        {db.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="host"
                            label="Host"
                            rules={[{ required: true, message: 'Please enter host' }]}
                        >
                            <Input placeholder="localhost or IP address" />
                        </Form.Item>

                        <Form.Item
                            name="port"
                            label="Port"
                            rules={[{ required: true, message: 'Please enter port' }]}
                        >
                            <Input type="number" />
                        </Form.Item>

                        <Form.Item
                            name="database"
                            label="Database Name"
                            rules={[{ required: true, message: 'Please enter database name' }]}
                        >
                            <Input placeholder="Database name" />
                        </Form.Item>

                        <Form.Item
                            name="username"
                            label="Username"
                            rules={[{ required: true, message: 'Please enter username' }]}
                        >
                            <Input placeholder="Database username" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[{ required: true, message: 'Please enter password' }]}
                        >
                            <Input.Password placeholder="Database password" />
                        </Form.Item>

                        <Form.Item
                            name="schema"
                            label="Schema (Optional)"
                        >
                            <Input placeholder="public" />
                        </Form.Item>
                    </>
                )}

                <Form.Item>
                    <Space>
                        <Button
                            icon={<ExperimentOutlined />}
                            onClick={handleTestConnection}
                            loading={testing}
                        >
                            Test Connection
                        </Button>
                        <Button
                            type="primary"
                            icon={<DatabaseOutlined />}
                            onClick={handleConnect}
                            loading={connecting || loading}
                        >
                            Connect
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default DatabaseConnector;