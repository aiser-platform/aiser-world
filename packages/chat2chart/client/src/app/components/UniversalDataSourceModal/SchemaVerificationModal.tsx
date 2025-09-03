'use client';

import React, { useState, useEffect } from 'react';
import {
    Modal,
    Steps,
    Card,
    Table,
    Button,
    Form,
    Input,
    Switch,
    Select,
    Tag,
    Alert,
    Space,
    Typography,
    Divider,
    Collapse,
    Tooltip,
    Progress,
    message,
    Row,
    Col,
} from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    EditOutlined,
    EyeOutlined,
    DownloadOutlined,
    InfoCircleOutlined,
    WarningOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { Panel } = Collapse;
const { TextArea } = Input;

interface SchemaVerificationModalProps {
    visible: boolean;
    dataSourceId: string;
    onClose: () => void;
    onSchemaVerified: (schema: any) => void;
}

interface VerificationData {
    data_source_id: string;
    schema: any;
    verification_checklist: any[];
    suggestions: any[];
    preview: any;
}

const SchemaVerificationModal: React.FC<SchemaVerificationModalProps> = ({
    visible,
    dataSourceId,
    onClose,
    onSchemaVerified,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [verificationProgress, setVerificationProgress] = useState(0);
    const [userFeedback, setUserFeedback] = useState<any>({});
    const [editingTable, setEditingTable] = useState<string | null>(null);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);

    useEffect(() => {
        if (visible && dataSourceId) {
            loadVerificationData();
        }
    }, [visible, dataSourceId]);

    const loadVerificationData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/data/schema/${dataSourceId}/verification`);
            const result = await response.json();
            
            if (result.success) {
                setVerificationData(result.verification_data);
            } else {
                message.error(`Failed to load verification data: ${result.error}`);
            }
        } catch (error) {
            message.error('Failed to load verification data');
            console.error('Error loading verification data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationComplete = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/data/schema/${dataSourceId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_feedback: userFeedback,
                }),
            });

            const result = await response.json();
            
            if (result.success) {
                message.success('Schema verified and updated successfully!');
                onSchemaVerified(result.updated_schema);
                onClose();
            } else {
                message.error(`Schema verification failed: ${result.error}`);
            }
        } catch (error) {
            message.error('Failed to verify schema');
            console.error('Error verifying schema:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportSchema = async (format: string) => {
        try {
            const response = await fetch(`/api/data/schema/${dataSourceId}/export?format=${format}`);
            const result = await response.json();
            
            if (result.success) {
                // Download the file
                const blob = new Blob([result.content], { type: result.content_type });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${dataSourceId}_schema.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                message.success(`Schema exported as ${format.toUpperCase()}`);
            } else {
                message.error(`Export failed: ${result.error}`);
            }
        } catch (error) {
            message.error('Failed to export schema');
            console.error('Error exporting schema:', error);
        }
    };

    const updateUserFeedback = (category: string, item: string, value: any) => {
        setUserFeedback((prev: Record<string, any>) => ({
            ...prev,
            [category]: {
                ...(prev && prev[category] ? prev[category] : {}),
                [item]: value,
            },
        }));
    };

    const getStepStatus = (stepIndex: number) => {
        if (stepIndex < currentStep) return 'finish';
        if (stepIndex === currentStep) return 'process';
        return 'wait';
    };

    const renderSchemaOverview = () => {
        if (!verificationData) return null;

        const { preview } = verificationData;
        
        return (
            <div>
                <Alert
                    message="Schema Overview"
                    description="Review the automatically generated schema structure and statistics."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Card title="Data Source Information" size="small">
                            <p><strong>Name:</strong> {preview.data_source.name}</p>
                            <p><strong>Type:</strong> {preview.data_source.type}</p>
                            <p><strong>ID:</strong> {preview.data_source.id}</p>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title="Schema Statistics" size="small">
                            <p><strong>Tables:</strong> {preview.summary.total_tables}</p>
                            <p><strong>Columns:</strong> {preview.summary.total_columns}</p>
                            <p><strong>Relationships:</strong> {preview.summary.total_relationships}</p>
                        </Card>
                    </Col>
                </Row>

                <Card title="Cube.js Mapping Preview" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', color: '#52c41a' }}>
                                    {preview.summary.estimated_measures}
                                </div>
                                <Text type="secondary">Measures</Text>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', color: '#1890ff' }}>
                                    {preview.summary.estimated_dimensions}
                                </div>
                                <Text type="secondary">Dimensions</Text>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', color: '#722ed1' }}>
                                    {preview.summary.estimated_time_dimensions}
                                </div>
                                <Text type="secondary">Time Dimensions</Text>
                            </div>
                        </Col>
                    </Row>
                </Card>
            </div>
        );
    };

    const renderTableVerification = () => {
        if (!verificationData) return null;

        const { preview } = verificationData;
        
        const tableColumns = [
            {
                title: 'Table Name',
                dataIndex: 'name',
                key: 'name',
            },
            {
                title: 'Columns',
                dataIndex: 'columns_count',
                key: 'columns_count',
                render: (count: number) => <Tag color="blue">{count}</Tag>,
            },
            {
                title: 'Rows',
                dataIndex: 'row_count',
                key: 'row_count',
                render: (count: number) => count.toLocaleString(),
            },
            {
                title: 'Actions',
                key: 'actions',
                render: (_: any, record: any) => (
                    <Space>
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => setEditingTable(record.name)}
                        >
                            Review
                        </Button>
                    </Space>
                ),
            },
        ];

        return (
            <div>
                <Alert
                    message="Table Structure Verification"
                    description="Review and verify the table structures, column types, and relationships."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Table
                    columns={tableColumns}
                    dataSource={preview.tables_preview}
                    rowKey="name"
                    pagination={false}
                    size="small"
                />

                {editingTable && (
                    <Card
                        title={`Table: ${editingTable}`}
                        extra={
                            <Button onClick={() => setEditingTable(null)}>
                                Close
                            </Button>
                        }
                        style={{ marginTop: 16 }}
                    >
                        <Collapse>
                            <Panel header="Column Details" key="columns">
                                <Table
                                    columns={[
                                        {
                                            title: 'Column',
                                            dataIndex: 'name',
                                            key: 'name',
                                        },
                                        {
                                            title: 'Type',
                                            dataIndex: 'type',
                                            key: 'type',
                                        },
                                        {
                                            title: 'Measure',
                                            dataIndex: 'is_measure',
                                            key: 'is_measure',
                                            render: (isMeasure: boolean) => (
                                                <Tag color={isMeasure ? 'green' : 'default'}>
                                                    {isMeasure ? 'Yes' : 'No'}
                                                </Tag>
                                            ),
                                        },
                                        {
                                            title: 'Dimension',
                                            dataIndex: 'is_dimension',
                                            key: 'is_dimension',
                                            render: (isDimension: boolean) => (
                                                <Tag color={isDimension ? 'blue' : 'default'}>
                                                    {isDimension ? 'Yes' : 'No'}
                                                </Tag>
                                            ),
                                        },
                                        {
                                            title: 'Time Dimension',
                                            dataIndex: 'is_time_dimension',
                                            key: 'is_time_dimension',
                                            render: (isTimeDimension: boolean) => (
                                                <Tag color={isTimeDimension ? 'purple' : 'default'}>
                                                    {isTimeDimension ? 'Yes' : 'No'}
                                                </Tag>
                                            ),
                                        },
                                    ]}
                                    dataSource={preview.tables_preview.find((t: any) => t.name === editingTable)?.sample_columns || []}
                                    pagination={false}
                                    size="small"
                                />
                            </Panel>
                        </Collapse>
                    </Card>
                )}
            </div>
        );
    };

    const renderVerificationChecklist = () => {
        if (!verificationData) return null;

        const { verification_checklist } = verificationData;
        
        return (
            <div>
                <Alert
                    message="Verification Checklist"
                    description="Complete the verification checklist to ensure schema accuracy."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Progress
                    percent={verificationProgress}
                    status={verificationProgress === 100 ? 'success' : 'active'}
                    style={{ marginBottom: 24 }}
                />

                {verification_checklist.map((category, categoryIndex) => (
                    <Card
                        key={categoryIndex}
                        title={category.category}
                        style={{ marginBottom: 16 }}
                    >
                        {category.items.map((item: any, itemIndex: number) => (
                            <div key={itemIndex} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                    <Text strong style={{ flex: 1 }}>
                                        {item.item}
                                    </Text>
                                    {item.required && (
                                        <Tag color="red">Required</Tag>
                                    )}
                                </div>
                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Select
                                        placeholder="Select verification status"
                                        style={{ width: 200 }}
                                        onChange={(value) => {
                                            updateUserFeedback(category.category, item.item, value);
                                            // Update progress
                                            const totalItems = verification_checklist.reduce(
                                                (sum, cat) => sum + cat.items.length, 0
                                            );
                                            const completedItems = Object.values(userFeedback).reduce(
                                                (sum: number, cat: any) => sum + Object.keys(cat || {}).length, 0
                                            );
                                            setVerificationProgress((completedItems / totalItems) * 100);
                                        }}
                                    >
                                        <Option value="verified">
                                            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Verified
                                        </Option>
                                        <Option value="needs_review">
                                            <ExclamationCircleOutlined style={{ color: '#faad14' }} /> Needs Review
                                        </Option>
                                        <Option value="incorrect">
                                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> Incorrect
                                        </Option>
                                    </Select>
                                </Form.Item>
                            </div>
                        ))}
                    </Card>
                ))}
            </div>
        );
    };

    const renderSuggestions = () => {
        if (!verificationData) return null;

        const { suggestions } = verificationData;
        
        return (
            <div>
                <Alert
                    message="Schema Improvement Suggestions"
                    description="Review AI-generated suggestions to optimize your schema for better analytics."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                {suggestions.map((suggestion, index) => (
                    <Alert
                        key={index}
                        message={suggestion.message}
                        description={suggestion.suggestion}
                        type={suggestion.type === 'warning' ? 'warning' : 'info'}
                        showIcon
                        style={{ marginBottom: 16 }}
                        action={
                            <Button size="small" type="primary">
                                Apply Suggestion
                            </Button>
                        }
                    />
                ))}
            </div>
        );
    };

    const steps = [
        {
            title: 'Schema Overview',
            content: renderSchemaOverview(),
        },
        {
            title: 'Table Verification',
            content: renderTableVerification(),
        },
        {
            title: 'Verification Checklist',
            content: renderVerificationChecklist(),
        },
        {
            title: 'Suggestions',
            content: renderSuggestions(),
        },
    ];

    return (
        <Modal
            title="Schema Verification & Management"
            open={visible}
            onCancel={onClose}
            width={1200}
            footer={[
                <Button key="export-yaml" icon={<DownloadOutlined />} onClick={() => handleExportSchema('yaml')}>
                    Export YAML
                </Button>,
                <Button key="export-json" icon={<DownloadOutlined />} onClick={() => handleExportSchema('json')}>
                    Export JSON
                </Button>,
                <Button key="export-cube" icon={<DownloadOutlined />} onClick={() => handleExportSchema('cube')}>
                    Export Cube.js
                </Button>,
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button
                    key="verify"
                    type="primary"
                    loading={loading}
                    disabled={verificationProgress < 100}
                    onClick={handleVerificationComplete}
                >
                    Verify & Deploy Schema
                </Button>,
            ]}
        >
            <div style={{ marginBottom: 24 }}>
                <Steps current={currentStep} onChange={setCurrentStep}>
                    {steps.map((step, index) => (
                        <Step
                            key={index}
                            title={step.title}
                            status={getStepStatus(index)}
                        />
                    ))}
                </Steps>
            </div>

            <div style={{ minHeight: 400 }}>
                {steps[currentStep].content}
            </div>
        </Modal>
    );
};

export default SchemaVerificationModal;
