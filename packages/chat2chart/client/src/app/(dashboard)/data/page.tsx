'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Table,
    Space,
    Tag,
    Modal,
    message,
    Row,
    Col,
    Statistic,
    Typography,
    Divider,
    Tooltip,
} from 'antd';
import {
    PlusOutlined,
    DatabaseOutlined,
    FileOutlined,
    ApiOutlined,
    CloudOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';

const { Title, Text } = Typography;

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api';
    status: 'connected' | 'disconnected' | 'error' | 'testing';
    connection_info?: any;
    lastUsed?: string;
    rowCount?: number;
    columns?: any[];
    size?: string;
    description?: string;
}

const DataSourcesPage: React.FC = () => {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);

    useEffect(() => {
        loadDataSources();
    }, []);

    const loadDataSources = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/data/sources');
            const result = await response.json();
            
            if (result.success) {
                setDataSources(result.data_sources || []);
            } else {
                message.error(`Failed to load data sources: ${result.error}`);
            }
        } catch (error) {
            message.error('Failed to load data sources');
            console.error('Error loading data sources:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDataSource = () => {
        setSelectedDataSource(null);
        setModalVisible(true);
    };

    const handleEditDataSource = (dataSource: DataSource) => {
        setSelectedDataSource(dataSource);
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedDataSource(null);
        loadDataSources(); // Refresh the list
    };

    const getDataSourceIcon = (type: string) => {
        switch (type) {
            case 'database':
                return <DatabaseOutlined style={{ color: '#1890ff' }} />;
            case 'file':
                return <FileOutlined style={{ color: '#52c41a' }} />;
            case 'api':
                return <ApiOutlined style={{ color: '#722ed1' }} />;
            case 'warehouse':
                return <CloudOutlined style={{ color: '#fa8c16' }} />;
            default:
                return <DatabaseOutlined />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected':
                return 'success';
            case 'disconnected':
                return 'default';
            case 'error':
                return 'error';
            case 'testing':
                return 'processing';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: DataSource) => (
                <Space>
                    {getDataSourceIcon(record.type)}
                    <Text strong>{text}</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Tag color="blue">{type.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status ? status.toUpperCase() : 'UNKNOWN'}
                </Tag>
            ),
        },
        {
            title: 'Rows',
            dataIndex: 'rowCount',
            key: 'rowCount',
            render: (count: number) => count ? count.toLocaleString() : '-',
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: string) => size || '-',
        },
        {
            title: 'Last Used',
            dataIndex: 'lastUsed',
            key: 'lastUsed',
            render: (date: string) => date || '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: DataSource) => (
                <Space>
                    <Tooltip title="View Details">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleEditDataSource(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditDataSource(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const stats = {
        total: dataSources.length,
        connected: dataSources.filter(ds => ds.status === 'connected').length,
        databases: dataSources.filter(ds => ds.type === 'database').length,
        files: dataSources.filter(ds => ds.type === 'file').length,
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Data Sources</Title>
                <Text type="secondary">
                    Connect and manage your data sources for analytics and visualization
                </Text>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Sources"
                            value={stats.total}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Connected"
                            value={stats.connected}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Databases"
                            value={stats.databases}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Files"
                            value={stats.files}
                            prefix={<FileOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Actions */}
            <div style={{ marginBottom: 16 }}>
                <Space>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddDataSource}
                    >
                        Add Data Source
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadDataSources}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                </Space>
            </div>

            <Divider />

            {/* Data Sources Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={dataSources}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} data sources`,
                    }}
                />
            </Card>

            {/* Universal Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={modalVisible}
                onClose={handleModalClose}
                onDataSourceCreated={() => {
                    handleModalClose();
                    loadDataSources();
                }}
            />
        </div>
    );
};

export default DataSourcesPage;